# 🎮 Project: PS-Tracker (PlayStation Store Intelligence Platform)

> **"잠들지 않는 감시자."**
> 플레이스테이션 게이머를 위한 **완전 자동화된 최저가 추적 및 AI 기반 추천** 플랫폼

## 1. 프로젝트 개요 (Overview)
* **Start Date:** 2025.11.23
* **Status:** Status: Level 19 Completed (Event-Driven Notification System)
* **Goal:** 24시간 365일, 시스템이 스스로 가격을 감시하고 데이터를 축적하는 완전 자동화 시스템 구축.

### 🎯 핵심 가치 (Value Proposition)
1.  **Automation:** 인간의 개입 없이 매일 새벽, 스스로 최신 정보를 수집하고 갱신.
2.  **Stability:** MSA 구조와 도커 컨테이너를 통해 환경에 구애받지 않는 안정적인 실행 보장.
3.  **Intelligence:** 단순 수집을 넘어, '갱신이 필요한 게임'만 선별하여 효율적으로 추적.
4.  **Reactivity:** 가격 하락 감지 시, 0.1초 내에 사용자에게 Discord 알림 발송.

---

## 2. 아키텍처 (Fully Dockerized MSA)

### 🏗 구조 및 역할 (The 5-Container Fleet)
| Service Name | Tech Stack | Role | Port |
| :--- | :--- | :--- | :--- |
| **Catalog Service** | Java 17, Spring Boot | **[Brain]** 스케줄러(Timer), 갱신 대상 선별, DB 적재 | 8080 |
| **Collector Service** | Python 3.10, Flask | **[Hand]** HTTP 명령 수신, Selenium Grid 원격 제어 | 5000 |
| **Selenium Grid** | Standalone Chrome | **[Eyes]** 도커 내부에서 브라우저 실행 (Remote Driver) | 4444 / 7900 |
| **MySQL** | MySQL 8.0 | **[Storage]** 정규화된 데이터 저장 (Volume Mount) | 3307 |
| **Adminer** | Adminer | **[Admin]** DB 관리 웹 인터페이스 | 8090 |

### 🔄 자동화 데이터 흐름 (Automation Flow)
1.  **Trigger:** Java 스케줄러가 매일 새벽 4시 (혹은 API 호출 시) Python Flask 서버(`POST /run`)를 깨움.
2.  **Crawl:** Python이 Selenium으로 최신 가격을 수집하여 Java로 전송.
3.  **Compare:** Java(`CatalogService`)가 DB의 '직전 가격'과 '현재 가격'을 비교.
4.  **Publish :** 가격 하락 감지 시 `GamePriceChangedEvent` 발행 (내부 방송).
5.  **Notify:** `@Async` 리스너가 이벤트를 청취하여 Discord Webhook 전송

---

## 3. 핵심 구현 내용 (Technical Details)

### ① Catalog Service (Java) - The Brain
* **Spring Scheduler:** `@Scheduled`를 사용하여 크롤링 작업을 정기적으로 트리거.
* **Targeting Logic:** '기간 존중' 원칙에 따라, 마지막 갱신일이 오래되었거나 할인 종료일이 지난 게임만 선별하여 수집기에게 전달.
* **Event System:** `ApplicationEventPublisher`를 사용하여 비즈니스 로직(저장)과 알림 로직(전송)을 완벽하게 분리

### ② Collector Service (Python) - The Hand
* **Flask Web Server:** 단순 스크립트 실행 방식에서 벗어나, 외부 명령을 대기하는 서버 형태로 진화.
* **Selenium Grid 연동:** `webdriver.Remote`를 사용하여 로컬 크롬이 아닌 도커 내부의 원격 브라우저 제어.
* **Smart Mode:**
    * **Phase 1 (Update):** Java가 지시한 게임 우선 갱신.
    * **Phase 2 (Discovery):** 신규 게임 탐색 및 추가.

### ③ Notification System (The Watcher)
- Tech: Spring Event + `@Async` + Discord Webhook
- Mechanism:
  - 트랜잭션 성능 저하 방지를 위해 알림 발송은 비동기 스레드에서 처리.
  - `CatalogService`는 알림 채널(Discord, Email 등)의 존재를 모름 (Loose Coupling).

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

<br>

## 5. 수집 정책: 3원칙 (The Crawling Constitution)

시스템의 안정성과 지속 가능성을 위해 아래 3가지 원칙을 준수합니다.

**✅ 1. 기간 존중 (Respect Period)**
* 무조건 전체 데이터를 긁지 않습니다. Java 애플리케이션이 선별해 준 **'갱신 대상'**만 우선 처리합니다.
* 이미 방문하여 데이터를 확보한 URL은 중복 수집하지 않습니다.

**✅ 2. 유저 우선 (User First)**
* (Level 20 예정) 사용자가 **찜한 게임**은 최우선 순위로 갱신합니다.

**✅ 3. 안전 제일 (Safety First)**
* `StaleElementReferenceException` 방지를 위해 **https://m.kpedia.jp/w/7709** 단계와 **[상세 방문]** 로직을 엄격히 분리했습니다.
* 과도한 트래픽 유발을 막기 위해 수집 건수 제한(Limit) 및 딜레이(Sleep)를 적용했습니다.

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

### 💥 Issue 5: 침묵하는 감시자 (The Silent Watcher)
* **증상:** 로직 구현 후 테스트를 돌렸으나 디스코드 알림이 오지 않음.
* **원인:** 버그가 아니라, 실제 가격 변동이 없었기 때문에 시스템이 정상적으로 침묵(Skip)한 것.
* **해결:** 테스트 시에는 강제로 이벤트를 발생(`if(true)`)시켜 연결을 확인하고, 검증 후 실제 변동 감지 로직으로 원상 복구.

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