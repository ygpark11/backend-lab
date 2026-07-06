# 🧠 핵심 구현 기술 상세 (Architecture & Implementation)

데이터 정합성 확보와 제한된 리소스 내 안정적인 서비스 운영을 위해 내린 주요 기술적 의사결정을 설명합니다.

---

## 1. Backend Strategy (Java & Spring Boot)

### 1-1. 선별적 수집 + 조건부 영속성 (Selective Collection & Conditional Persistence)

* **Problem:** 매일 전체 게임을 크롤링하고 무조건 `INSERT`를 수행할 경우, 불필요한 크롤링 부하와 중복 데이터 누적으로 DB 용량 및 조회 성능에 영향을 줌.
* **Solution:**
  * **수집 대상 선별:** 마지막 수집 이후 하루가 지난 게임과 할인 종료일이 도래한 게임만 수집 대상으로 지정. 가격 변동이 없는 게임은 수집 자체를 건너뜀.
  * **조건부 저장:** `CatalogService` 내 `isSameCondition()` 메서드로 이전 데이터와 비교하여, 가격·할인율·세일 종료일 중 하나라도 변동이 있을 때만 DB에 저장.
* **Effect:** 크롤링 요청 수와 DB 쓰기 횟수를 줄여 1GB RAM 환경에서의 부하를 낮추고, 가격 이력 테이블의 불필요한 레코드 누적을 방지.

---

### 1-2. 이벤트 기반 아키텍처 (Event-Driven Architecture)

* **Problem:** 가격 변동 저장 로직과 FCM·Discord 알림 발송 로직이 강하게 결합(Coupling)되면, 알림 전송 실패 시 트랜잭션 전체가 롤백될 위험이 있음.
* **Solution:** `ApplicationEventPublisher`를 도입하여 가격 저장 로직(Core)과 알림 발송 로직(Side Effect)을 분리.
  * 가격 변동 저장 완료 후 `GamePriceChangedEvent`를 발행.
  * 이벤트 리스너에 `@Async`를 적용하여 알림 발송을 별도 스레드에서 비동기 처리.
* **Effect:** 알림 발송 중 예외가 발생해도 데이터 저장에는 영향을 주지 않음. 알림 로직 변경 시 핵심 도메인 코드를 수정하지 않아도 됨.

---

### 1-3. 타입 안전한 동적 쿼리 + 역정규화 (QueryDSL & Denormalization)

#### 동적 복합 검색 (Complex Search)
* 가격 범위, Metacritic 점수, 장르, 할인율 등 N개 조건을 조합하는 검색 요청을 처리하기 위해 QueryDSL `BooleanBuilder` 기반 동적 쿼리를 구현.
* 컴파일 타임에 쿼리 오류를 감지할 수 있어 런타임 에러 발생 지점을 줄임.

#### 조인 비용 제거를 위한 역정규화
* **Problem:** 할인 게임 목록 조회 시, 1:N 관계인 `GamePriceHistory` 테이블에서 게임별 최근 가격을 구하는 Greatest-N-per-Group 서브쿼리와 Join이 매 조회마다 발생. 1GB RAM 환경에서 동시 접속 시 CPU 스파이크로 이어짐.
* **Solution:** `current_price`, `discount_rate`, `lowest_price` 등 검색·정렬에 필수적인 필드를 `Game` 메인 엔티티에 중복 컬럼으로 배치(역정규화).
  * 단일 테이블 스캔으로 조회 가능하여 Join 연산을 제거.
  * 데이터 갱신(Upsert) 시점에 트랜잭션 내에서 두 테이블의 데이터를 동기화하여 정합성 유지.

---

### 1-4. JDK 21 가상 스레드 기반 I/O 병렬 처리 (Virtual Thread Parallelism)

* **Context:** 게임 상세 조회 시 '연관 게임 추천(DB)', '가격 이력 변환(In-Memory)', '패밀리 게임 목록(DB)' 등 서로 독립적인 작업이 순차적으로 실행되어 불필요한 대기 시간 발생.
* **Solution:** JDK 21 가상 스레드와 `CompletableFuture.allOf()`를 조합한 Fan-out 패턴으로 독립 I/O 작업을 병렬 처리.

**1GB RAM 환경에서 가상 스레드를 선택한 이유:**
Tomcat 플랫폼 스레드(기본 200개)는 스레드당 수백 KB~1MB의 스택 메모리를 점유하지만, 가상 스레드는 수십 KB 단위로 생성되어 메모리 부담이 낮음. I/O 대기 중 캐리어 스레드를 반납하는 구조로 코어 수가 적은 환경에서도 처리 효율을 높일 수 있음.

**ThreadLocal 비상속 문제 해결:**
가상 스레드는 부모 `ThreadLocal`(JPA 세션)을 상속하지 않음. 이로 인해 엔티티의 Lazy 컬렉션에 접근 시 `LazyInitializationException`이 발생함.
* **Solution:** 엔티티 대신 **QueryDSL DTO 프로젝션**(`QGameSearchResultDto`)으로 전환하여 세션 의존 자체를 제거.
* `fetch join + limit` 조합 시 Hibernate가 LIMIT을 무시하고 전체 로우를 메모리에 올리는 문제도 **2-Query 패턴(목록 조회 → 장르 배치 IN 쿼리)**으로 함께 해결.

---

### 1-5. 리소스 제약을 고려한 4-Cache 하이브리드 전략 (Local Cache & Eviction)

* **Problem:** B2C 카탈로그 서비스 특성상 게임 상세·통계·큐레이션·구독 가격 조회에 읽기 요청이 집중되지만, 1GB RAM 환경에서 별도 Redis 서버를 운영하는 것은 OOM 위험이 있음. 또한 게임 기본 정보(일 단위 변경)와 유저 찜/투표 상태(실시간 변경)를 동일한 방식으로 캐싱할 수 없음.
* **Solution:** 데이터 생명주기에 맞춘 4-Cache 하이브리드 전략.

| 캐시명 | 대상 데이터 | TTL | 무효화 방식 |
| :--- | :--- | :--- | :--- |
| `gameDetailCache` | 게임 상세 (메타·가격 이력) | 24h | 배치 완료 시 웹훅 일괄 무효화 |
| `insightsCache` | 통계 대시보드 | 24h | 배치 완료 시 웹훅 일괄 무효화 |
| `curationCache` | 큐레이션 테마 미리보기 | 24h | 배치 완료 시 웹훅 일괄 무효화 |
| `psPlusPricingCache` | PS Plus 구독 가격 | 24h | 가격 갱신 시 `@CacheEvict` 즉시 무효화 |

**정적/동적 데이터 분리 조립:**
캐싱된 게임 메타 정보(정적)를 꺼낸 뒤, 유저의 찜·투표 상태(동적)는 별도 DB 조회 후 `withDynamicData()`로 조립하여 반환. 캐시 정합성을 유지하면서 개인화 데이터를 함께 제공.

**Spring AOP Self-Invocation 해결:**
`@Cacheable` 메서드를 동일 클래스에서 호출 시 Spring AOP 프록시가 개입하지 않아 캐시가 무시되는 문제를, `CatalogService`(쓰기/조율)와 `GameReadService`(읽기/캐시)로 빈을 분리하여 해결.

**배치 기반 일괄 무효화:**
일일 배치가 완료되는 즉시 내부 웹훅 API를 호출하여 4개 캐시를 일괄 무효화. 무거운 통계·큐레이션 쿼리의 DB 부하를 첫 요청 이전에 처리하여, 서비스 재개 직후에도 지연 없이 최신 데이터를 제공.

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
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | 개발 과정 37가지 기술 이슈 분석 |
