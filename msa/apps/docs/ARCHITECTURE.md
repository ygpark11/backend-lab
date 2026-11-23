# 🧠 핵심 구현 기술 상세 (Architecture & Implementation)

초기 1GB RAM 환경의 제약에서 출발해 Node 1을 2코어 8GB ARM64 환경으로 확장하기까지, 데이터 정합성과 운영 안정성을 확보하기 위해 내린 주요 기술적 의사결정을 설명합니다.

---

## 1. Backend Strategy (Java 25 & Spring Boot 4.1)

### 1-1. 선별적 수집 + 조건부 영속성 (Selective Collection & Conditional Persistence)

* **Problem:** 매일 전체 게임을 크롤링하고 무조건 `INSERT`를 수행할 경우, 불필요한 크롤링 부하와 중복 데이터 누적으로 DB 용량 및 조회 성능에 영향을 줌.
* **Solution:**
  * **수집 대상 선별:** 마지막 수집 이후 하루가 지난 게임과 할인 종료일이 도래한 게임만 수집 대상으로 지정. 가격 변동이 없는 게임은 수집 자체를 건너뜀.
  * **조건부 저장:** `CatalogService` 내 `isSameCondition()` 메서드로 이전 데이터와 비교하여, 가격·할인율·세일 종료일 중 하나라도 변동이 있을 때만 DB에 저장.
* **Effect:** 크롤링 요청 수(특히 1GB RAM 환경인 수집 워커 Node 2·3)와 DB 쓰기 횟수를 줄이고, 가격 이력 테이블의 불필요한 레코드 누적을 방지.

---

### 1-2. 이벤트 기반 아키텍처 (Event-Driven Architecture)

* **Problem:** 가격 변동 저장 로직과 FCM·Discord 알림 발송 및 캐시 무효화 로직이 강하게 결합(Coupling)되면, 부가 기능 실패 시 핵심 트랜잭션이 롤백되거나 외부 HTTP I/O 동안 DB 커넥션이 점유될 위험이 있음.
* **Solution:** `ApplicationEventPublisher`와 `@TransactionalEventListener`를 도입하여 핵심 도메인 저장(Core)과 후속 부가 작업(Side Effect)을 분리.
  * 가격 변동 저장 완료 후 `GamePriceChangedEvent`, 수집 완료 시 `PioneerScrapingCompletedEvent`, 배치 완료 시 `BatchCompletedEvent`를 발행.
  * 모든 이벤트 페이로드는 Java `record`로 불변 설계하여 `@Async` 경계로 Detached JPA 엔티티가 넘어가지 않도록 스칼라 ID·값만 전달.
  * `GamePriceChangedListener`, `PsPlusDiscountListener`, `ScrapingEventListener`에서 DB 쓰기와 외부 FCM HTTP 발송을 별도 트랜잭션 경계로 분리하여, 외부 네트워크 대기 중 HikariCP 커넥션을 점유하지 않도록 개선.
* **Effect:** 알림 발송 중 예외가 발생해도 데이터 저장에는 영향을 주지 않으며, 도메인 서비스 간 순환/강결합 없이 알림·캐시 갱신 확장이 가능.

---

### 1-3. 타입 안전한 동적 쿼리 + 역정규화 + 조건부 단일 스캔 (QueryDSL & Denormalization)

#### 동적 복합 검색 (Complex Search)
* 가격 범위, Metacritic 점수, 장르, 할인율 등 N개 조건을 조합하는 검색 요청을 처리하기 위해 OpenFeign QueryDSL 7.7(`io.github.openfeign.querydsl:querydsl-jpa`) 기반 동적 쿼리를 구현.
* 검색·찜 응답용 `@QueryProjection` DTO(`GameSearchResponse`, `WishlistResponse`, `GameGenreResult`)를 포함해 대부분의 요청/응답 DTO를 Java `record`로 통일하고, 17개 조건절과 프로젝션 로직을 공통 헬퍼 메서드로 통합.

#### 조인 비용 제거를 위한 역정규화 & 단일 스캔 통계 집계
* **Problem:** 할인 게임 목록 조회 시 1:N 관계인 `GamePriceHistory` 테이블에서 게임별 최근 가격을 구하는 Greatest-N-per-Group 서브쿼리와 Join이 매 조회마다 발생해 동시 접속 시 CPU 스파이크를 유발. 또한 `InsightsService` 통계 대시보드 역시 20회에 달하는 개별 count 쿼리로 DB 왕복 비용이 컸음.
* **Solution:**
  * `current_price`, `discount_rate`, `lowest_price` 등 검색·정렬에 필수적인 필드를 `Game` 메인 엔티티에 역정규화하여 단일 테이블 조회로 Join 제거(데이터 갱신 시 트랜잭션 내 동기화).
  * `GameRepositoryCustomImpl.fetchGameInsightStats()`에서 `CaseBuilder` 조건부 집계 1회 쿼리로 게임 통계 지표를 한 번에 조회하도록 통합(`InsightsService` 20쿼리 → 3쿼리, 19개 개별 캐시 → `InsightsSummaryResponse` 1개 캐시).

---

### 1-4. 5-Cache 하이브리드 전략 & 계층 분리 (Local Cache & Eviction)

* **Problem:** B2C 카탈로그 서비스 특성상 게임 상세·통계·큐레이션·구독 가격·트렌딩 조회에 읽기 요청이 집중됨. 초기 1GB RAM 환경의 Redis OOM 위험에서 출발해 2코어 8GB ARM64 단일 노드로 확장한 현재까지도 네트워크 왕복 없는 인프로세스 캐시가 적합함. 단, 게임 기본 정보(일 단위 변경), 유저 찜/투표 상태(실시간 변경), 찜 TOP N(시간 단위 변경)은 생명주기가 달라 단일 정책으로 관리할 수 없음.
* **Solution:** 데이터 생명주기에 맞춘 Caffeine 5-Cache 하이브리드 전략 (`GlobalCacheConfig`).

| 캐시명 | 대상 데이터 | TTL | 상한 | 무효화 방식 |
| :--- | :--- | :--- | :--- | :--- |
| `gameDetailCache` | 게임 상세 (메타·가격 이력) | 24h | 5,000건 | 배치 완료 시 웹훅 일괄 무효화 |
| `insightsCache` | 통계 대시보드 (`InsightsSummaryResponse`) | 24h | 50건 | 배치 완료 시 `BatchCompletedEvent` 무효화 |
| `curationCache` | 큐레이션 테마 미리보기 | 24h | 30건 | 배치 완료 시 웹훅 일괄 무효화 |
| `psPlusPricingCache` | PS Plus 구독 가격 | 24h | 1건 | 가격 갱신 시 `@CacheEvict` / 배치 완료 이벤트 무효화 |
| `trendingCache` | 찜 TOP N 게임 목록 | 1h | 1건 | TTL 자동 만료 (찜 변화에 빠르게 반응) |

**정적/동적 데이터 분리 조립 & AOP 순서 보장:**
* 캐싱된 게임 메타 정보(정적)를 꺼낸 뒤, 유저의 찜·투표 상태(동적)만 별도 DB 조회 후 `withDynamicData()`로 조립하여 반환.
* `@EnableCaching(order = Ordered.HIGHEST_PRECEDENCE)`를 지정하여 캐시 히트 시 `@Transactional` 프록시 진입 전에 즉시 반환함으로써 불필요한 DB 커넥션/EntityManager 생성을 방지.

**서비스 책임 분리 (`CatalogService` / `GameReadService` / `CatalogAdminService`):**
* 동일 클래스 내 `@Cacheable` Self-Invocation을 해결하기 위해 읽기/캐시 전담 `GameReadService`를 분리.
* 관리자 CRUD와 외부 크롤러 HTTP refresh(`triggerSingleGameRefresh`)를 `CatalogAdminService`로 분리하여, 외부 HTTP 호출이 DB 트랜잭션을 물지 않도록 경계를 정비.

**배치 기반 일괄 무효화:**
* 일일 배치가 완료되는 즉시 내부 웹훅 API를 호출하여 `BatchCompletedEvent` 및 캐시 무효화를 트리거하고, 최신 통계·카탈로그가 반영되도록 구성.

---

### 1-5. 전역 예외 처리 표준화 + AOP 기반 성능 가시성 확보

* **Problem:** 과거 컨트롤러마다 예외 응답이 불일치하고 리소스 미존재(404), 외부 크롤러 장애(503), 서버 내부 오류(500)가 구분되지 않았으며, 서비스 실행 시간을 관측할 단일 지점이 없었음.
* **Solution:**
  * `ErrorCode` + `BusinessException` + `@RestControllerAdvice` `GlobalExceptionHandler`를 통해 전역 예외를 단일 진입점에서 `ErrorResponse(String message)` JSON 레코드로 통일 (`*_NOT_FOUND` → 404 Not Found, `CRAWLER_UNAVAILABLE` → 503 Service Unavailable, `IllegalArgumentException`/검증 실패 → 400 Bad Request, `IllegalStateException` → 409 Conflict, 그 외 `Exception` → 500 + 안전 메시지).
  * `@Aspect` + `@Around("within(@org.springframework.stereotype.Service *)")`로 모든 서비스 빈의 실행 시간을 횡단 관심사로 측정하는 `ServiceExecutionAspect` 운영. 500ms 초과 시 `[SLOW]` WARN 로그를 기록해 Grafana Loki에서 선제적으로 탐지.
* **Effect:** 예외 처리 책임이 한 곳으로 집중되어 컨트롤러가 비즈니스 로직에만 집중하며, HTTP 상태 코드 의미와 직렬화(Jackson 3 `tools.jackson.*`) 일관성을 유지.

---

### 1-6. Meilisearch 하이브리드 검색 아키텍처 & 장애 격리 (Hybrid Search & Graceful Fallback)

* **Problem:** MySQL `REPLACE LIKE` + `JSON_SEARCH` 기반 검색은 PS 스토어 게임명 특성(부제·로마숫자·특수문자·한영 혼용·언어 태그·오타) 대응에 구조적 한계가 있었음(실운영 3,626건 38개 쿼리 기준 성공률 15.8%). 반대로 16개 복합 필터·실시간 가격·할인·역대최저가·위시리스트까지 검색 엔진에 전부 복제(Full Offload)할 경우, 일일 크롤링 시 분산 데이터 정합성 리스크와 필터 이중 관리 비용이 급증함.
* **기술 선정 (검색 대안 비교):**

| 후보 기술 | 검토 결과 | 판단 근거 |
| :--- | :---: | :--- |
| **MySQL `FULLTEXT (ngram)`** | 기각 | 추가 인프라 없이 역색인 가능하나, 오타 허용(Fuzzy) 미지원으로 오타 검색 요구사항 해결 불가 |
| **Elasticsearch / OpenSearch** | 기각 | Nori 형태소 분석·집계 기능은 강력하나, 3,626건 규모 및 단일 ARM64 노드(2 vCPU · 8GB) 대비 JVM 메모리 부담과 샤드·매핑·플러그인 운영 복잡도가 과다 |
| **Typesense** | 차선 | C++ 인메모리 기반·ARM64 지원의 동급 경량 후보이나, LMDB 메모리 매핑 구조와 직관적인 기본 랭킹 규칙·레퍼런스 접근성 기준으로 Meilisearch 선택 |
| **Algolia (SaaS)** | 기각 | 무료 플랜 월 요청 한도(1만 건) 초과 시 과금 리스크 및 외부 네트워크 종속 |
| **Meilisearch (`v1.57`)** | **채택** | Rust + LMDB 기반 ARM64 공식 지원, 오타·접두사·동의어·커스텀 랭킹 설정이 단순하며 실운영 실측 **RAM 40.02 MiB · 디스크 16.7 MB**로 경량 운영 가능 |

* **Solution:** **역할을 분리한 하이브리드 검색 구조** 채택 (MySQL 스키마 변경 0).
  * **자동완성 (`/api/v1/games/suggest`):** Meilisearch(`games` 인덱스)에서 `id, displayName, imageUrl`을 인기도·관련도 순으로 직접 응답.
  * **키워드 검색 (`/api/v1/games/search?keyword=...`):** Meilisearch에서 관련도 순 `gameId` 목록(최대 500건)만 조회한 뒤, 기존 `GameRepositoryCustomImpl.searchGamesByIds()`에 `game.id IN (...)` 조건으로 넘겨 **기존 16개 필터·실시간 가격·페이징·위시리스트 조립은 MySQL에서 그대로 처리**. 기본 정렬(`lastUpdated,desc`) 상태일 때는 `CaseBuilder`로 Meilisearch 관련도 순을 유지하고, 가격·할인율·메타스코어 정렬 선택 시 해당 정렬을 존중.
  * **한글 특화 색인 파이프라인 (`SearchTextNormalizer`):** 외부 SDK 없이 Spring 내장 `RestClient`(`JdkClientHttpRequestFactory`)로 연동. 언어 태그 정제(`cleanTitle`), 두벌식 QWERTY-자모 양방향 ASCII 인코딩(`qwertyText`), 19개 초성 고유 ASCII 매핑(`chosungAscii`, `search_keywords` 포함), PS 스토어 한영·로마숫자 동의어 사전, 단일 HTTP `/multi-search` (`matchingStrategy: "all"`)를 적용.
  * **이중 동기화 전략:** 가격 변동만 있는 크롤링은 건너뛰고, 신규 게임·제목/이미지 변경(`/collect`), AI 검색어 생성(`AiDescriptionScheduler`), 관리자 수정/삭제(`CatalogAdminService`) 시에만 `@TransactionalEventListener(AFTER_COMMIT)` + `@Async`로 증분 반영. 매일 오전 `05:00 KST`(`GameSearchSyncScheduler`) 전체 리싱크(3,626건 ~1.6초)와 기동 시 빈 인덱스 자동 색인, 관리자 수동 재색인(`POST /api/v1/admin/search/reindex`)으로 정합성 보정.
  * **장애 격리 (Graceful Fallback):** 검색 전용 클라이언트 타임아웃을 `connect 200ms / read 400ms`로 제한하고, Meilisearch 다운·타임아웃·오류 시 예외를 전파하지 않고 즉시 기존 MySQL `nameContains` 검색으로 자동 폴백하며 `pstracker.search.fallback` Micrometer 카운터를 기록.
* **Effect:** 실전 검색 성공률 **15.8% → 97.4%**(Top-1 **7.9% → 94.7%**), ARM64 실운영 **RAM 40.02 MiB · 디스크 16.7 MB**로 경량 운영하며 Meilisearch가 중단돼도 MySQL 폴백으로 서비스 검색 연속성을 유지.

---

## 2. Data Engineering (Python & Playwright)

### 2-1. 아키텍처 전환 (Selenium → Playwright)

* **Problem:** Selenium(JSON Wire Protocol, HTTP)은 브라우저 명령마다 HTTP 요청이 발생하여 네트워크 딜레이가 크고, 저사양 환경에서 브라우저 제어가 불안정하여 건당 3분 이상의 수집 시간 소요.
* **Solution:** 브라우저 내부 프로토콜(CDP)에 WebSocket으로 직접 연결하는 Playwright로 엔진 교체.
  * `Route API`로 이미지·미디어·폰트 요청을 네트워크 단에서 차단하여 불필요한 리소스 다운로드 제거.
  * `wait_until='commit'` 전략으로 DOM이 완전히 그려지기 전 네트워크 응답만 받은 시점에 파싱 시작하여 대기 시간 단축.
* **Result:** 수집 속도 건당 30초 내외로 단축.

---

### 2-2. 경량 봇 탐지 우회 (Minimal Stealth Strategy)

* **Problem:** Playwright 기본 실행 시 `navigator.webdriver` 속성이 노출되어 스토어 측 보안 솔루션에 탐지될 수 있음.
* **Solution:** 무거운 서드파티 라이브러리(`undetected-chromedriver`) 대신, `page.add_init_script()`로 경량 스크립트를 주입하여 `navigator.webdriver` 속성을 제거.

---

### 2-3. 메모리 수명주기 관리 (Resource Lifecycle Management)

* **Problem:** 1GB RAM 환경에서 Headless Chrome을 장시간 유지할 경우, 크롬 탭의 힙 메모리 누적과 대용량 HTML 문자열로 인한 OOM 및 서버 Freezing 발생.
* **Solution:** OS·런타임·코드 세 계층의 방어 전략.
  * **V8 힙 제한:** `--js-flags="--max-old-space-size=256"` 인자로 크롬 탭 하나의 메모리 점유를 런타임 레벨에서 제한.
  * **대용량 변수 즉시 해제:** HTML 문자열 파싱 후 `del` 키워드로 즉시 참조 해제하여 GC 부담 완화.
  * **배치 단위 브라우저 재시작:** 15건 수집마다 브라우저를 완전 종료하고 `gc.collect()`를 호출하여 메모리를 강제 초기화. `init: true`(Tini)와 조합하여 좀비 프로세스 누적을 방지.
* **Effect:** 1GB RAM 환경에서 2,500개 이상 게임을 처리하는 장시간 배치를 안정적으로 운영.

---

## 관련 문서

| 문서 | 내용 |
| :--- | :--- |
| [AUTH_GUIDE.md](AUTH_GUIDE.md) | OAuth2 + JWT 인증 파이프라인 (HttpOnly Cookie, Silent Refresh) |
| [OBSERVABILITY.md](OBSERVABILITY.md) | PLG 모니터링 스택 (Grafana Alloy + Grafana Cloud + Deadman Switch) |
| [DEPLOYMENT.md](DEPLOYMENT.md) | 3-Node 서버 배포, CI/CD 파이프라인, 멀티 아키텍처 빌드 |
| [EXTERNAL_SERVICES.md](EXTERNAL_SERVICES.md) | Google Gemini, FCM, Discord 연동 |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | 개발 과정 23가지 핵심 기술 이슈 분석 |
