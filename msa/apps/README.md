# 🎮 Project: PS-Tracker (PlayStation Store Intelligence Platform)

> **"잠들지 않는 감시자."**
> 플레이스테이션 게이머를 위한 **완전 자동화된 최저가 추적 및 AI 기반 추천** 플랫폼

## 1. 프로젝트 개요 (Overview)
* **Start Date:** 2025.11.23
* **Status:** Level 26 Completed (The Wishlist - Personalization & Optimization)
* **Goal:** "가격(Price)" 정보를 넘어 "가치(Value/Rating)" 정보를 통합하여 합리적 구매 판단 지원.

### 🎯 핵심 가치 (Value Proposition)
1.  **Automation:** 인간의 개입 없이 매일 새벽, 스스로 최신 정보를 수집하고 갱신.
2.  **Stability:** MSA 구조와 도커 컨테이너를 통해 환경에 구애받지 않는 안정적인 실행 보장.
3.  **Intelligence:** 단순 수집을 넘어, '갱신이 필요한 게임'만 선별하고 **'변동이 있을 때만 저장'** 하여 효율 극대화.
4.  **Resilience:** 네트워크 지연, 레이아웃 변경, 보이지 않는 텍스트 등 온갖 예외 상황에서도 살아남는 강인한 수집 능력.
5.  **Reactivity:** 가격 하락 감지 시, 0.1초 내에 사용자에게 Discord 알림 발송.
6.  **Value-Aware:** 단순 최저가가 아닌, Metacritic 점수와 유저 평점을 함께 제공하여 '싼 게 비지떡'인지 '숨겨진 명작'인지 판별.
7   **Insight:** 복합 조건(할인율+평점+가격) 검색을 통해 사용자가 원하는 "진짜 꿀매물"을 발굴.

---

## 2. 아키텍처 (Fully Dockerized MSA)

### 🏗 구조 및 역할 (The 5-Container Fleet)
| Service Name | Tech Stack | Role | Port |
| :--- | :--- | :--- | :--- |
| **Catalog Service** | Java 17, Spring Boot, **Spring Security** | **[Brain]** 스케줄러, **회원/인증 관리**, DB 적재 | 8080 |
| **Collector Service** | Python 3.10, Flask | **[Hand]** HTTP 명령 수신, Selenium Grid 원격 제어 | 5000 |
| **Selenium Grid** | Standalone Chrome | **[Eyes]** 도커 내부에서 브라우저 실행 (Remote Driver) | 4444 / 7900 |
| **MySQL** | MySQL 8.0 | **[Storage]** 정규화된 데이터 저장 (Volume Mount) | 3307 |
| **Adminer** | Adminer | **[Admin]** DB 관리 웹 인터페이스 | 8090 |

### 🔄 자동화 데이터 흐름 (Automation Flow)
1.  **Trigger:** Java 스케줄러가 매일 새벽 4시 (혹은 API 호출 시) Python Flask 서버(`POST /run`)를 깨움.
2.  **Smart Crawl:** Python이 Selenium으로 최신 가격을 수집 (Retry & JS Injection 적용)하여 Java로 전송.
3.  **Logical Compare: Java(`CatalogService`)가 DB의 '직전 가격' 및 '할인 조건'을 정밀 비교.
4.  **Save on Change: 변동이 감지된 경우에만 INSERT 수행 (Data Diet).
5.  **Notify:** 가격 하락 시 `GamePriceChangedEvent` 발행 → Discord Webhook 비동기 전송.

---

## 3. 핵심 구현 내용 (Technical Details)

### ① Catalog Service (Java) - The Brain
* **Smart Upsert Pattern:** 무조건적인 `INSERT`를 지양하고, 엔티티(`GamePriceHistory`) 내부에 `isSameCondition()` 비즈니스 로직을 구현. 가격, 할인율, 세일 종료일, Plus 혜택 여부 등을 비교하여 "실질적 변동"이 있을 때만 저장함으로써 DB 공간 절약 및 멱등성 확보.
* **Targeting Logic:** '기간 존중' 원칙에 따라 갱신이 필요한 게임만 선별하여 수집기에게 전달.
* **Event System:** `ApplicationEventPublisher`를 사용하여 비즈니스 로직과 알림 로직을 분리

### ② Collector Service (Python) - The Hand
* **Universal Parser:** 게임마다 다른 레이아웃("포함", "무료", 다중 오퍼 등)을 모두 처리할 수 있는 범용 파싱 로직 구현.
* **Container-Based Scanning:** 특정 아이콘만 찾는 '저격수' 방식에서, 가격 박스 전체(`offer_container`)를 확보한 뒤 텍스트와 태그를 복합적으로 분석하는 '산탄총' 방식으로 전환하여 Plus 회원 전용가 인식률 100% 달성.
* **Deep DOM Extraction:** 화면에 렌더링되지 않은 텍스트(Hidden Elements)를 읽지 못하는 `.text` 속성의 한계를 극복하기 위해, `get_attribute("textContent")`를 사용하여 DOM 내부의 원시 데이터를 직접 추출.
* **Smart Wait & Retry:** 네트워크 지연에 대비한 `Explicit Wait`와 간헐적 실패(Flaky)를 잡기 위한 `Retry Mechanism` 도입.
* **Self-Healing Pagination:** 대량 수집(Max 300 Page) 시 발생할 수 있는 브라우저 메모리 누수(Memory Leak)를 방지하기 위해, 일정 주기(20페이지)마다 드라이버를 스스로 리셋(Restart)하여 장기 실행 안정성 확보.

### ③ Notification System (The Watcher)
* **Tech:** Spring Event + `@Async` + Discord Webhook
* **Mechanism:** 트랜잭션 분리 및 비동기 처리로 메인 로직 성능 보호.

### ④ Value Integration (IGDB API) - The Intelligence
* **Heuristic Search Algorithm:** 기계적인 ID 매칭의 한계(Region Lock)를 극복하기 위해, **'데이터의 특성'**을 활용한 휴리스틱 알고리즘 도입.
    1. **Noise Reduction:** "Digital Deluxe", "Sound Edition", "PS5" 등 검색 정확도를 떨어뜨리는 노이즈 키워드를 Regex로 정밀 타격하여 제거.
    2. **English Title Priority:** PS Store에서 수집한 한글 제목 대신, 데이터 매칭 확률이 높은 **영문 제목(English Title)**을 우선 사용하여 검색.
    3. **Popularity Sorting:** 검색 결과 중 **`total_rating_count`(전체 리뷰 수)가 가장 많은 항목**을 본편(Main Game)으로 간주하여 선택 (정확도 95% 이상).
* **Fail-Safe Design:** 외부 API(IGDB) 장애나 평점 누락이 내부 핵심 로직(가격 저장)을 방해하지 않도록 철저한 격리 (`try-catch` & `Log-only`).

### ⑤ Anti-Ban Strategy (The Stealth)
- Stealth Mode: `undetected-chromedriver`를 도입하여 '봇 탐지'를 우회하고 사람처럼 행동.
- Respect Period (기간 존중): Java Repository 레벨에서 **"할인 기간이 남은 게임"**은 수집 대상에서 원천 배제(NOT EXISTS 쿼리). 트래픽을 90% 이상 절감하여 차단 확률 최소화.
- Smart Target: 무조건적인 전수 조사(300페이지)를 버리고, "베스트 셀러(10페이지) + 유저 찜(On-Demand)" 전략으로 전환.

### ⑥ Text Normalization Engine (The Filter)
IGDB 검색 성공률을 끌어올린 정규화 로직.
* **Platform Tag Removal:** `PS4`, `PS5`, `PS VR2` 등 불필요한 플랫폼 태그 삭제.
* **Edition Cleaner:** `Deluxe`, `Ultimate`, `Game of the Year` 등 에디션 명칭을 제거하여 본편 검색 유도.
* **Hidden Noise Filter:** `Sound`, `Anime`, `Music` 등 애니메이션 게임의 부제가 본편 제목을 가리는 현상을 방지하기 위해 조건부 제거 로직 적용.
* **Invisible Char Trimmer:** 탭(`\t`), 줄바꿈, 인코딩 찌꺼기 등 눈에 보이지 않는 문자열 전처리.

### ⑦ Search Engine (QueryDSL) - The Analyst
Spring Boot 3 + QueryDSL 5.0 기반의 Type-Safe 동적 쿼리 엔진 구축.
* **Complex Filtering:** 가격 범위(`min/max`), 할인율, 메타/유저 평점, 플랫폼 등 N개의 조건을 조합하여 검색 가능.
* **Snapshot Query:** `Game`과 `GamePriceHistory`의 1:N 관계에서, `JPAExpressions` 서브쿼리를 사용하여 "가장 최근 가격(Last Recorded)" 만을 정확하게 조인(Latest Snapshot).
* **Zero-Overhead Projection:** 엔티티 전체를 조회하는 비효율을 제거하기 위해, `@QueryProjection`을 사용하여 필요한 데이터만 DTO로 즉시 변환. (조회 성능 최적화)

### ⑧ Member & Security (The Gatekeeper)
Spring Security 6.1+ (Lambda DSL)와 JWT를 활용한 Stateless 인증 시스템 구축.
* **Stateless Architecture:** 세션을 사용하지 않고, **JWT(Access + Refresh Token)** 기반의 토큰 인증을 구현하여 MSA 환경에서의 확장성 확보.
* **Standard Auth Flow:** `UserDetailsService`를 정석으로 구현하여 Spring Security의 표준 인증 체계(Provider -> Manager -> Filter)를 준수.
* **Secure Password:** `BCryptPasswordEncoder`를 사용하여 비밀번호를 안전하게 단방향 암호화하여 저장.
* **Fine-Grained Access Control:**
    * `Public`: 게임 조회, 검색, 회원가입, 로그인
    * `User`: 내 정보 조회, (추후) 찜하기
    * `Admin`: 수동 크롤링 트리거(`manual-crawl`) 등 관리자 기능

### ⑨ Wishlist & Optimization (The Memory)
단순한 N:M 매핑을 넘어, 대규모 트래픽 상황을 가정한 **Extreme Performance Tuning** 적용.
* **Zero-Select Write:** 찜하기 요청 시, `SecurityContext`의 JWT에서 파싱한 ID와 `getReferenceById(Proxy)`를 결합하여 **DB 조회 없이(0 Select)** 즉시 `INSERT` 수행.
* **MemberPrincipal Expansion:** JWT 토큰 페이로드에 `memberId(PK)`를 포함시켜, 인증 필터 단계에서 DB 접근 없이 완전한 인증 객체 생성.
* **Fetch Join & Batch Size:** "내 찜 목록" 조회 시 QueryDSL `Fetch Join`으로 게임 정보를 한 번에 가져오고, `default_batch_fetch_size` 설정을 통해 N+1 문제 없이 가격 정보까지 효율적으로 로딩.

```mermaid
sequenceDiagram
    autonumber
    participant Scheduler as ⏰ Scheduler (Java)
    participant Crawler as 🐍 Collector (Python)
    participant Chrome as 🌐 Selenium Grid
    participant Store as 🛒 PS Store
    participant Service as 🧠 Catalog Service
    participant IGDB as 👾 IGDB API
    participant DB as 💾 MySQL
    participant Discord as 🔔 Discord

    Note over Scheduler, Crawler: 1. Trigger Phase (Level 24 예정)
    Scheduler->>Crawler: POST /run (Start Batch)
    activate Crawler
    
    Note over Crawler, Store: 2. Crawling Phase
    loop Pagination (Max 10)
        Crawler->>Chrome: Connect & Request Page
        Chrome->>Store: GET /category/...
        Store-->>Chrome: Response HTML
        Crawler->>Chrome: get_attribute("textContent")
        Note right of Crawler: Precision Logic (Strikethrough)

        loop Per Game
            Crawler->>Service: POST /collect (Info & Price)
            activate Service
            
            Note over Service, DB: 3. Logic & Mash-up Phase
            
            %% [Level 23 추가] IGDB 연동 구간
            Service->>IGDB: Search Game (ID -> Name)
            IGDB-->>Service: Return Ratings (Meta/User)
            
            Service->>DB: Fetch Latest History
            DB-->>Service: Return Entity
            
            Service->>Service: isSameCondition() Check
            
            alt Condition Changed (Data Diet 실패)
                Service->>DB: INSERT New History (Price + Ratings)
                
                opt Price Drop Detected
                    Service--)Discord: Send Alert (Async Event)
                end
            else No Change (Data Diet 성공)
                Service->>Service: Skip INSERT
                Note right of Service: Log: "No Change"
            end
            deactivate Service
        end
        
        opt Every 20 Pages
            Crawler->>Chrome: Restart Driver (Memory Leak Protection)
        end
    end
    deactivate Crawler
```
---

## 4. 아키텍처 의사결정 (ADR: Event vs MQ)

### Q. 왜 RabbitMQ나 Kafka 같은 메시지 큐를 쓰지 않고 Spring Event를 사용했는가?
우리는 **오버 엔지니어링을 경계**하고 현재 규모에 가장 적합한 **실용주의적 아키텍처**를 선택했습니다.

| 비교 항목 | Spring Event (In-Memory) | Message Queue (Kafka/RabbitMQ) |
| :--- | :--- | :--- |
| **채택 여부** | **✅ 채택 (Current)** | ❌ 보류 (Future) |
| **비유** | 옆자리 동료에게 쪽지 건네기 | 우체국에 등기 우편 보내기 |
| **범위** | 단일 JVM (같은 프로세스 내부) | 분산 시스템 (서버 간 통신) |
| **복잡도** | 최하 (코드 몇 줄로 구현) | 중/상 (별도 인프라 구축 필요) |

> **💡 결정 이유**
> 1. 현재 단일 인스턴스이며, 알림 누락이 서비스에 치명적이지 않음.
> 2. 초기 단계에서는 **구현 속도와 유지보수성**을 최우선으로 함.
> 3. *추후 인스턴스가 확장되거나, 결제 알림 등 영속성이 필수적인 기능이 추가될 때 도입 예정.*

### Q. 왜 Session 대신 JWT를 선택했는가?
단일 서버임에도 불구하고 Session 방식 대신 JWT를 도입했습니다.

| 비교 항목 | Session 기반 | JWT (Token) 기반 |
| :--- | :--- | :--- |
| **채택 여부** | ❌ | **✅ 채택** |
| **저장소** | 서버 메모리 (Stateful) | 클라이언트 (Stateless) |
| **확장성** | 서버 다중화 시 세션 클러스터링 필요 | **서버가 늘어나도 별도 설정 불필요** |
| **Client** | 웹 브라우저 친화적 | **Web/Mobile/App 어디서든 사용 용이** |

> **💡 결정 이유**
> 1.  **Collector Service와의 확장성:** 추후 수집기가 별도 인증을 태워야 하거나, 모바일 앱 출시를 고려할 때 토큰 방식이 유리함.
> 2.  **REST API 원칙 준수:** 서버는 클라이언트의 상태를 저장하지 않아야 한다(Stateless)는 REST 아키텍처 스타일에 부합.

<br>

## 5. 수집 정책: 4원칙 (The Crawling Constitution)

시스템의 안정성과 지속 가능성을 위해 아래 3가지 원칙을 준수합니다.

**✅ 1. 기간 존중 (Respect Period)**
* Java 애플리케이션이 선별해 준 **'갱신 대상'**만 우선 처리하며, 불필요한 트래픽을 유발하지 않는다.

**✅ 2. 데이터 다이어트 (Data Diet)**
* "변하지 않았다면 기록하지 않는다."
* 불필요한 중복 데이터를 방지하여 스토리지 비용을 절감하고 조회 성능을 유지한다.

**✅ 3. 정밀 타격 (Precision Strike)**
* "보이지 않는 것도 본다."
* 단순 텍스트 추출이 아닌, DOM 내부의 `textContent`를 조회하여 렌더링 이슈를 극복한다.
* 실패 시 즉시 포기하지 않고, 재시도(Retry)를 통해 수집 성공률을 올린다.

**✅ 4. 안전 제일 (Safety First)**
* `StaleElementReferenceException` 방지를 위한 **[탐색]**과 [방문] 로직 분리.
* 수집 건수 제한(Limit) 및 딜레이(Sleep) 적용.
<br>

## 6. 핵심 코드 스니펫 (Code Context)

### 📢 Event Publisher (`CatalogService.java`)
가격 변동이 감지되면 이벤트를 발행합니다. 구독자(Listener)가 누구인지는 알 필요가 없는 **느슨한 결합**을 유지합니다.

```java
// 핵심 로직: 가격 하락 시에만 이벤트 발행
if (oldPrice != null && request.getCurrentPrice() < oldPrice) {
        log.info("🚨 Price Drop Detected! {} ({} -> {})", game.getName(), oldPrice, request.getCurrentPrice());

        // 이벤트를 던지고 즉시 다음 로직으로 넘어감 (Non-blocking)
        eventPublisher.publishEvent(new GamePriceChangedEvent(
        game.getName(),
        game.getPsStoreId(),
        oldPrice,
        request.getCurrentPrice(),
        request.getDiscountRate(),
        game.getImageUrl()
    ));
            }
```

### 👂 Async Listener (`DiscordNotificationListener.java`)
이벤트를 수신하여 비동기로 처리합니다. 메인 로직의 성능에 영향을 주지 않습니다.

```java
@Async // 별도 스레드에서 실행 (메인 로직 블로킹 방지)
@EventListener
public void handlePriceChange(GamePriceChangedEvent event) {
    // Discord Webhook으로 실제 알림 전송
    String message = String.format("🚨 가격 하락! %s: %d원 -> %d원", 
                                   event.getGameName(), event.getOldPrice(), event.getNewPrice());
    restTemplate.postForEntity(webhookUrl, payload, String.class);
}
```

### 🛡️ Smart Upsert (`CatalogService.java`)

```java
// 변동이 있을 때만 저장 (Data Diet)
if (shouldSaveHistory(latestHistoryOpt, request)) {
        priceHistoryRepository.save(history); // INSERT
checkAndPublishAlert(...); // 알림 체크
} else {
        log.debug("👌 No Change: {} (Skipping DB Insert)", game.getName());
}
```

### 🕷️ Invisible Text Extraction (`app.py`)
Selenium의 한계를 넘어서는 JavaScript 주입 기법.

```python
# 요소를 화면 중앙으로 강제 스크롤 (로딩 유도)
driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", price_elem)

# DOM Attribute Access (변경)
# 화면 표시 여부(visibility)와 무관하게 DOM 트리에 있는 텍스트 원본을 가져옴
raw_price = price_elem.get_attribute("textContent").strip()
```

---

### 🕷🔍 Dynamic Query (`GameRepositoryImpl.java`)
QueryDSL을 활용하여 복합 조건 검색과 최신 가격 스냅샷 조회를 동시에 처리

```java
// 핵심 로직: 1:N 관계에서 가장 최근의 가격 이력만 가져오기 (Subquery)
gamePriceHistory.recordedAt.eq(
        JPAExpressions
                .select(gamePriceHistory.recordedAt.max())
        .from(gamePriceHistory)
        .where(gamePriceHistory.game.eq(game))
        ),
// 동적 검색 조건 (Null Safe)
nameContains(condition.getKeyword()),
priceBetween(condition.getMinPrice(), condition.getMaxPrice()),
metaScoreGoe(condition.getMinMetaScore())
```

---

## 7. 트러블슈팅 (Troubleshooting Log)
개발 과정에서 마주친 주요 이슈와 해결 방법

### 💥 Issue 1: Docker 내부 통신 불가
* **원인:** 컨테이너 내부에서 `localhost`는 호스트 머신이 아닌 컨테이너 자기 자신을 의미함.
* **해결:** Docker Compose Service Name(`catalog-service`)을 호스트명으로 사용하여 DNS 기반 통신 구현.

### 💥 Issue 2: GUI 없는 리눅스에서의 Selenium 실행
* **해결:** **Selenium Grid (Standalone Chrome)** 컨테이너를 별도로 띄우고, Python에서 `Remote WebDriver`로 원격 접속하여 해결.

### 💥 Issue 3: Stale Element Reference Exception
* **원인:** 목록 페이지 루프(Loop) 도중 DOM 변경으로 인해 기존 Element의 참조가 소실됨.
* **해결:** [탐색]과 [방문]을 분리. 목록 페이지에서 URL 문자열만 먼저 싹 긁어온 뒤(Copy), 별도로 방문하는 방식으로 로직 개선.

### 💥 Issue 4: Git 추적 문제 (venv)
* **증상:** `.gitignore` 설정 미숙으로 가상환경 폴더(`venv`)가 깃허브에 업로드됨.
* **해결:** `/venv` 슬래시 제거 후 `git rm -r --cached` 명령어를 통해 로컬 파일은 유지하고 원격 저장소에서만 삭제.

### 💥 Issue 5: 침묵하는 0원 (The Silent Zero)
* **증상:** 가격을 못 찾았을 때 0원으로 DB에 저장되어, 멀쩡한 게임이 무료 게임으로 둔갑하고 알림이 오발송됨.
* **해결:** Guard Clause(방어 코드) 추가. 유효한 가격을 찾지 못하면 데이터를 전송하지 않고 `Skip` 처리.

### 💥 Issue 6: 유령 데이터 (The Ghost Data)
* **증상:** 가격은 같은데 `sale_end_dat`e가 `NULL`인 데이터가 중복으로 쌓임.
* **원인:** PS Store 페이지 로딩 딜레이로 인해, 가격은 떴지만 날짜 텍스트가 렌더링되기 전에 크롤러가 지나가버림.
* **해결:** `Smart Wait` 도입. 가격 관련 요소가 뜰 때까지 명시적으로 기다리도록 변경.

### 💥 Issue 7: 보이지 않는 텍스트 (Invisible Text)
* **증상:** HTML 요소는 존재하는데 `.text` 값이 빈 문자열(`''`)로 반환됨.
* **원인:** 최신 웹 프레임워크의 렌더링 최적화로 인해 화면 밖(Off-screen) 요소의 텍스트를 Selenium이 읽지 못함.
* **해결:** `driver.execute_script("return arguments[0].textContent;")`를 사용하여 DOM 레벨에서 텍스트 강제 추출.

### 💥 Issue 8: Lombok과 Jackson의 Boolean 전쟁
* **증상:** 파이썬은 `true`를 보냈는데, 자바 DB에는 계속 `false`(0)로 저장됨.
* **원인:** Lombok은 boolean 필드(`isPlus`)의 Getter를 `isPlus()`로 생성하지만, Jackson 라이브러리는 Getter 이름이 `is`로 시작하면 필드명을 plus로 추론하여 매핑 실패. (Java Bean Naming Convention 충돌)
* **해결:** DTO 필드에 `@JsonProperty("isPlusExclusive")`를 명시하여 JSON 키 값을 강제로 고정.

### 💥 Issue 9: IP 차단 (Access Denied)
* **증상:** 과도한 페이지네이션(300페이지) 시도로 인해 소니 보안 시스템(Akamai)에 의해 IP 차단됨.
* **해결:**
  1. 전략 수정: 수집 대상을 '상위 10페이지'로 축소 (Pareto 법칙).
  2. 기간 존중: DB 쿼리를 수정하여, 유효한 세일 정보가 있는 게임은 크롤러에게 전달하지 않음.
  3. Stealth: `fake-useragent` 및 랜덤 딜레이 적용.

### 💥 Issue 10: 에디션의 역습 (Noise Keywords)
* **증상:** "Dragon Ball: Sparking! Zero Sound Ultimate Edition" 검색 시 결과 없음.
* **원인:** `Sound`, `Ultimate`, `Edition` 등 수식어가 너무 많아 검색 엔진이 본편을 찾지 못함.
* **해결:** 정규 표현식(Regex)을 이용해 수식어 패턴을 정밀하게 제거하고 핵심 키워드("Dragon Ball Sparking! Zero")만 추출하여 검색 성공.

### 💥 Issue 11: 엇갈린 이름, 거부된 저장 (Column Mismatch)
* **증상:** 찜하기 기능 테스트 중 `Field 'user_id' doesn't have a default value` 에러 발생하며 500 응답.
* **원인:** 초기 설계 시 DB 테이블은 `user_id`로 생성되었으나, Java 엔티티(`Wishlist`)는 `member_id`로 매핑하여 ORM 불일치 발생.
* **해결:** 개발 단계임을 감안하여 테이블을 `DROP` 후 재생성하여 엔티티 설정(`member_id`)과 DB 스키마를 동기화.
* **Lesson:** `ddl-auto` 설정에만 의존하지 말고, 실제 생성된 스키마를 항시 확인해야 함.
* 
---

## 8. 실행 방법 (How to Run)

### ① 전체 시스템 실행 (Docker Compose)
빌드와 실행을 한 번에 처리하는 권장 명령어

- Mac/Linux
```bash
./gradlew clean build -x test && docker-compose up --build -d
```
- Windows (PowerShell)
```powershell
./gradlew clean build -x test ; docker-compose up --build -d
```

### ② 상태 확인
```bash
docker ps
# 5개의 컨테이너(mysql, api, collector, browser, adminer)가 모두 Up 상태여야 함.
```

### ③ (Optional) 브라우저 화면 훔쳐보기 (NoVNC)
도커 내부에서 실제로 크롤링하는 화면을 볼 수 있습니다.

- 접속: `http://localhost:7900`
- 비밀번호: `secret`

### ④ 수동 크롤링 트리거 (Manual Trigger)
스케줄러 시간을 기다리지 않고 즉시 실행하려면:

- Method: POST
- URL: `http://localhost:8080/api/v1/games/manual-crawl`

### ⑤ Data Verification
- Adminer 접속: `http://localhost:8090`
- System: MySQL / Server: `mysql` / User: `user` / PW: `password`
- `games` 및 `game_price_history` 테이블 데이터 확인.

### ⑥ 수동 크롤링 트리거 (Manual Trigger)
**[Admin Only]** 관리자 권한을 가진 토큰(Bearer Token)이 필요
- Method: POST
- URL: `http://localhost:8080/api/v1/games/manual-crawl`
- Header: `Authorization: Bearer {ADMIN_ACCESS_TOKEN}`
---