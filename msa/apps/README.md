# 🎮 Project: PS-Tracker (PlayStation Store Intelligence Platform)

* **Start Date:** 2025.11.23
* **Status:** Level 16 Completed - Intelligent Crawler & Polyglot MSA
* **Tech Stack:**
    * **Core:** Java 17, Spring Boot 3.x (JPA, H2)
    * **Collector:** Python 3.x, Selenium, Requests

---

## 1. 프로젝트 기획 (Project Planning)
*단순한 쇼핑몰 클론이 아닌, 데이터 기반의 의사결정 도구 개발*

### 🎯 핵심 가치 (Value Proposition)
1.  **Intelligence:** 역대 최저가, 메타크리틱 점수, 가격 방어율 분석을 통한 "구매 적기" 판단.
2.  **Automation:** 사람이 아닌 '수집기(Collector)'가 24시간 감시하는 자동화 시스템.
3.  **Profit:** 최저가 알림 구독 및 AI 구매 조언 리포트 제공 (수익화 모델).

### 📋 기능 요구사항 (Requirements)
* **R1. 데이터 수집:** PS Store의 동적 페이지(React)를 크롤링하여 가격, 이미지, 할인 정보 수집.
* **R2. 데이터 적재:** 수집된 데이터를 RDB에 저장하되, 중복을 방지하고 가격 변동 내역을 관리.
* **R3. 이종 통신:** Python(수집)과 Java(서비스) 간의 효율적인 데이터 파이프라인 구축.

---

## 2. 아키텍처 (Polyglot MSA)

### 🏗 구조 및 역할
| Service Name | Tech Stack | Role | Port |
| :--- | :--- | :--- | :--- |
| **Catalog Service** | Java 17, Spring Boot | **[Data Center]** 데이터 저장, API 서빙, 트랜잭션 관리 | 8080 |
| **Collector Service** | Python 3.x, Selenium | **[Worker]** 동적 웹 크롤링, HTML 파싱, 데이터 전송 | N/A |

### 🔄 데이터 흐름 (Data Flow)
1.  **Target:** PS Store 상세 페이지 (JavaScript 동적 렌더링).
2.  **Crawling (Python):** `Selenium`으로 브라우저를 띄우고 `WebDriverWait`로 로딩 대기.
3.  **Transfer:** 수집된 데이터를 JSON으로 가공하여 Java API (`POST /collect`)로 전송.
4.  **Upsert (Java):** DB에 없는 게임이면 `Insert`, 이미 존재하면 가격 정보만 `Update`.

---

## 3. 핵심 구현 내용 (Implementation Details)

### ① Data Model (Java Entity)
* **Game Entity:**
    * `psStoreId` (Unique Key): 데이터 중복 방지.
    * `currentPrice`, `discountRate`: 현재 가격 및 할인율.
    * `saleEndDate`: 할인 종료일 파싱 저장 (Day 3 추가).

### ② Crawling Strategy (Python) ★ Key Tech
* **Batch Crawling:** 목록 페이지에서 URL 리스트를 확보 후 순차적으로 상세 페이지 방문.
* **Deep Parsing:**
    * **가격/할인:** `data-qa` 속성을 활용하여 정확한 태그 타겟팅.
    * **Offer Loop:** 체험판(Offer0)과 본편(Offer1)이 섞여 있는 경우, 유효한 가격이 나올 때까지 순차 탐색 (`for` loop).
    * **Date Parsing:** "2025. 11. 30." 형태의 텍스트를 `LocalDate` 호환 포맷으로 변환.

---

## 4. 트러블슈팅 (Log)

### 💥 Issue 1: 복합 상품 가격 파싱 실패
* **증상:** '스파이더맨 2' 처럼 체험판이 기본 옵션인 경우 가격을 못 찾고 에러 발생.
* **원인:** 크롤러가 첫 번째 옵션(`offer0`)만 확인했는데, 실제 가격은 두 번째 옵션(`offer1`)에 있었음.
* **해결:** `offer0` ~ `offer2`를 순회하며 가격이 존재하는 옵션을 찾도록 로직 개선.

### 💥 Issue 2: StaleElementReferenceException
* **증상:** 요소를 찾았는데 데이터를 꺼내려는 순간 "요소가 사라졌다"며 에러.
* **원인:** SPA(React) 사이트 특성상 화면이 비동기로 깜빡이며 재렌더링됨.
* **해결:** `time.sleep()`과 `WebDriverWait`를 적절히 조합하여 렌더링 완료 대기.

### 💥 Issue 3: WSL 환경 호환성
* **해결:** GUI 브라우저(Chrome) 실행을 위해 수집기는 Windows PowerShell 환경에서 구동.

---

## 5. 실행 방법 (How to Run)

### ① Catalog Service (Java)
```bash
cd apps/catalog-service
./gradlew bootRun
```

### ② Collector Service (Python)
```bash
cd apps/collector-service
# Windows PowerShell
.\venv\Scripts\activate
# Run Batch
python batch_crawler.py
```

### ③ H2 Database Console (Verification)
- URL: `http://localhost:8080/h2-console`
- JDBC URL: `jdbc:h2:mem:pstracker`