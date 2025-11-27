# 🎮 Project: PS-Tracker (PlayStation Store Intelligence Platform)

> **"호구 되지 말고, 고민 하지 말자."**
> 플레이스테이션 게이머를 위한 **최저가 알림 및 AI 기반 취향 저격 게임 추천** 플랫폼

## 1. 프로젝트 개요 (Overview)
* **Start Date:** 2025.11.23
* **Status:** Level 16 Completed (PoC & Polyglot Architecture)
* **Goal:** 단순한 가격 정보를 넘어, 게이머의 '돈'과 '시간'을 아껴주는 인텔리전스 서비스.

### 🎯 핵심 가치 (Value Proposition)
1.  **Save Money:** 역대 최저가 분석 및 할인 타이밍 예측 (가격 추적).
2.  **Save Time:** 사용자 취향(태그, 장르) 기반의 개인화 게임 추천 (AI 큐레이션).
3.  **Architecture:** Java(Spring Boot)와 Python을 결합한 Polyglot MSA 구조.

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

## 3. 핵심 구현 내용 (Technical Details)

### ① Catalog Service (Java)
* **Game Entity 설계:**
    * `psStoreId` (Unique Key): PS Store URL의 고유 ID를 사용하여 데이터 중복 방지.
    * **Upsert Logic:** `findByPsStoreId` 조회 후 존재 여부에 따라 분기 처리.
* **H2 Database Config:** In-memory DB 사용 및 콘솔 활성화 (`application.yml`).

### ② Collector Service (Python) ★ Key Tech
* **Selenium 도입:** `requests`로는 불가능한 React/Vue 기반 동적 페이지(SPA) 크롤링 구현.
* **Batch Crawling (List & Detail Pattern):**
    * **Phase A (목록):** 카테고리 페이지에서 `a[href*='/product/']` 패턴으로 상세 페이지 URL 목록 확보.
    * **Phase B (상세):** 확보된 URL을 순회(Loop)하며 상세 정보를 수집 및 전송.
* **Deep Parsing:**
    * **가격/할인:** `data-qa` 속성을 활용하여 정확한 태그 타겟팅.
    * **Offer Loop:** 체험판(Offer0)과 본편(Offer1)이 섞여 있는 경우, 유효한 가격이 나올 때까지 순차 탐색 (`for` loop).
    * **Date Parsing:** "2025. 11. 30." 형태의 텍스트를 `LocalDate` 호환 포맷으로 변환.

---

## 4. 차세대 설계 (Next Step: Level 16.5 Planning)
PoC를 넘어 실제 서비스를 위한 확장 설계입니다. (In-Progress)

### 🛠️ 데이터베이스 고도화 (MySQL Migration)
기존 단일 테이블 구조를 정규화하여 관계형 데이터베이스(MySQL)로 이관합니다.
* **`games`**: 변하지 않는 게임의 마스터 정보 (장르, 태그 포함).
* **`price_history`**: 가격 변동의 **모든 이력**을 시계열로 저장.
* **`wishlists`**: 유저별 찜 목록 및 목표 가격 알림 설정.

### 🤖 수집 3원칙 (The Crawling Constitution)
1.  **기간 존중 (Respect Period):** 할인 종료일이 많이 남은 게임은 불필요하게 재수집하지 않는다.
2.  **망루 감시 (Watchtower):** 매일 밤 '총 할인 개수'를 체크하고, 급격한 변동(Flash Sale)이 있을 때만 전체를 스캔한다.
3.  **유저 우선 (User First):** 유저가 '찜'한 게임은 위 규칙을 무시하고 무조건 최신 상태를 유지한다.

---

## 5. 트러블슈팅 (Troubleshooting Log)

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

## 6. 실행 방법 (How to Run)

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