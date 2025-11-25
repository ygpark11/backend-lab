# 🎮 Project: PS-Tracker (PlayStation Store Intelligence Platform)

* **Start Date:** 2025.11.23
* **Status:** Polyglot Architecture & Batch Crawling
* **Tech Stack:**
    * **Core:** Java 17, Spring Boot 3.x (JPA, H2)
    * **Collector:** Python 3.x, Selenium, Requests

---

## 1. 프로젝트 기획 및 설계 (Project Planning)
*단순한 쇼핑몰 클론이 아닌, 데이터 기반의 의사결정 도구 개발*

### 🎯 핵심 가치 (Value Proposition)
1.  **Intelligence:** 역대 최저가, 메타크리틱 점수, 가격 방어율 분석을 통한 "구매 적기" 판단.
2.  **Automation:** 사람이 아닌 '수집기(Collector)'가 24시간 감시하는 자동화 시스템.
3.  **Profit:** 최저가 알림 구독 및 AI 구매 조언 리포트 제공 (수익화 모델).

### 📋 기능 요구사항 (Requirements)
* **R1. 데이터 수집:** PS Store의 동적 페이지(React)를 크롤링하여 가격, 이미지, 메타데이터 수집.
* **R2. 데이터 적재:** 수집된 데이터를 RDB에 저장하되, 중복을 방지하고 가격 변동 내역을 관리.
* **R3. 이종 통신:** Python(수집)과 Java(서비스) 간의 효율적인 데이터 파이프라인 구축.

---

## 2. 아키텍처 (Polyglot MSA Architecture)

### 🏗 구조도 및 역할 분담
언어별 장점을 극대화하기 위해 **Polyglot(다중 언어)** 전략을 채택함.

| Service Name | Tech Stack | Role | Port |
| :--- | :--- | :--- | :--- |
| **Catalog Service** | Java 17, Spring Boot | **[Data Center]** 데이터 저장, API 서빙, 트랜잭션 관리 | 8080 |
| **Collector Service** | Python 3.x, Selenium | **[Worker]** 동적 웹 크롤링, HTML 파싱, 데이터 전송 | N/A |

### 🔄 데이터 흐름 (Data Flow)
1.  **Target:** PS Store 상세 페이지 (JavaScript로 렌더링되는 동적 사이트).
2.  **Crawling (Python):** `Selenium` + `WebDriver`를 이용해 브라우저를 띄우고 렌더링 대기.
3.  **Transfer:** 수집된 데이터를 JSON으로 가공하여 Java API (`POST /api/v1/games/collect`)로 전송.
4.  **Upsert (Java):** DB에 없는 게임이면 `Insert`, 이미 존재하면 가격 정보만 `Update`.

---

## 3. 핵심 구현 내용 (Implementation Details)

### ① Catalog Service (Java)
* **Game Entity 설계:**
    * `psStoreId` (Unique Key): PS Store URL에 포함된 고유 ID를 사용하여 데이터 중복 방지.
    * **Upsert Logic:** `findByPsStoreId` 조회 후 존재 여부에 따라 분기 처리.
* **H2 Database Config:**
    * `application.yml` 설정을 통해 In-memory DB 접속 허용 및 콘솔 활성화.

### ② Collector Service (Python) ★ Key Tech
* **Selenium 도입 이유:** `requests` 라이브러리만으로는 React/Vue 기반의 동적 페이지(빈 HTML)를 읽을 수 없어, 실제 브라우저 엔진인 Selenium 도입.
* **Batch Crawling (List & Detail Pattern):**
    * **Phase A (목록):** 카테고리 페이지에서 `a[href*='/product/']` 패턴으로 상세 페이지 URL 목록을 먼저 확보.
    * **Phase B (상세):** 확보된 URL을 순회(Loop)하며 상세 정보를 수집 및 전송.
* **Robust Logic:**
    * **Explicit Wait:** 무작정 기다리는 것이 아니라, 특정 태그(`data-qa`)가 뜰 때까지 스마트하게 대기.
    * **Data-QA Selector:** 자주 바뀌는 클래스명 대신, 불변 속성인 `data-qa`를 타겟팅.

---

## 4. 트러블슈팅 & 학습 노트 (Troubleshooting Log)

### 💥 Issue 1: WSL 환경과 가상환경 충돌
* **증상:** WSL 터미널에서 윈도우용으로 생성된 `venv`(`Scripts` 폴더)를 실행하려다 에러 발생.
* **원인:** OS마다 가상환경 구조가 다름 (Windows는 `Scripts`, Linux는 `bin`).
* **해결:** Selenium(GUI 브라우저) 실행을 위해 **Windows PowerShell**로 환경을 전환하여 실행.

### 💥 Issue 2: StaleElementReferenceException (썩은 참조 에러)
* **증상:** 요소를 찾았는데, 데이터를 꺼내려는 순간 "요소가 사라졌다"며 에러 발생.
* **원인:** 모던 웹(SPA)은 화면을 비동기로 깜빡이며 다시 그리기 때문에, 잡고 있던 태그가 순식간에 옛날 것(Stale)이 됨.
* **해결:** `time.sleep()`으로 렌더링이 완전히 끝날 때까지 넉넉하게 대기.

### 💥 Issue 3: Element Visibility vs Presence
* **증상:** `h1` 태그가 있는데도 `TimeoutException` 발생.
* **원인:** `visibility_of` 조건은 "눈에 보일 때"를 기다리는데, 로딩 중에 잠깐 투명하거나 가려져 있어서 타임아웃 발생.
* **해결:** `presence_of` (HTML에 존재하기만 하면 됨) 조건으로 완화하여 해결.

---

## 5. 실행 방법 (How to Run)

### ① Catalog Service (Java)
```bash
cd apps/catalog-service
./gradlew bootRun
# Server listening on 8080...
```

### ② Collector Service (Python)
- Prerequisite: Chrome Browser Installed
```bash
cd apps/collector-service
# Windows PowerShell
.\venv\Scripts\activate

# Run Batch Crawler
python batch_crawler.py
```

### ③ H2 Database Console (Verification)
- URL: `http://localhost:8080/h2-console`
- Settings:
  -  JDBC URL: `jdbc:h2:mem:pstracker` (application.yml 설정값)
  -  User Name: `sa`
  -  Password: *(Empty)*