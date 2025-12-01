# 🎮 Project: PS-Tracker (PlayStation Store Intelligence Platform)

> **"호구 되지 말고, 고민 하지 말자."**
> 플레이스테이션 게이머를 위한 **최저가 알림 및 AI 기반 취향 저격 게임 추천** 플랫폼

## 1. 프로젝트 개요 (Overview)
* **Start Date:** 2025.11.23
* **Status:** Level 17 Completed (MySQL Migration & Intelligent Crawling)
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
| **Catalog Service** | Java 17, Spring Boot, JPA | **[Core]** 게임 정보 및 가격 이력(History) 관리 | 8080 |
| **Collector Service** | Python 3.10+, Selenium | **[Worker]** 정가/할인가/장르/종료일 상세 파싱 | N/A |
| **Database** | MySQL 8.0 (Docker) | **[Storage]** 정규화된 데이터 저장 (Games, PriceHistory) | 3307 |

### 🔄 데이터 흐름 (Level 17 Update)
1.  **Crawling:** Python 수집기가 상세 페이지에서 `Original Price`(정가), `Genre`, `Sale End Date` 파싱.
2.  **Payload:** JSON 포맷으로 Java API (`/api/v1/games/collect`) 전송.
3.  **Upsert Strategy:**
    * **Game:** 정보가 변했으면(장르, 이미지 등) Update, 없으면 Insert.
    * **PriceHistory:** 과거 데이터를 덮어쓰지 않고 무조건 **Append(Insert)**하여 시계열 데이터 확보.

---

## 3. 핵심 구현 내용 (Technical Details)

### ① Catalog Service (Java)
* **Entity 리팩토링 (Normalization):**
    * `Games`: 변하지 않는 정보 (제목, 이미지, 장르, 배급사).
    * `GamePriceHistory`: 변하는 정보 (가격, 정가, 할인율, Plus여부, 종료일).
* **MySQL Database:**
    * Docker Compose 기반의 `MySQL 8.0` 도입.
    * `utf8mb4` 설정을 통해 다국어 및 이모지 지원 완벽 대응.

### ② Collector Service (Python) ★ Key Tech
* **Selenium 고도화:** SPA(React) 페이지의 Lazy Loading을 처리하기 위한 `WebDriverWait` 전략 최적화.
* **Deep Parsing (Level 17):**
    * **정가 추출:** `originalPrice` 태그(취소선) 유무를 판단하여 실제 할인율 검증.
    * **메타 데이터:** `Genre IDs`(장르), `PS Plus Exclusive`(독점 여부) 추가 파싱.
* **Batch Crawling Pattern:**
    * **Phase A (목록):** 카테고리 페이지에서 URL 목록 확보.
    * **Phase B (상세):** 확보된 URL을 순회하며 상세 정보 수집. (가격표 로딩 대기 로직 포함)

---

## 4. 차세대 설계 (Next Step: Level 18 Planning)
수동 실행을 넘어 **완전 자동화** 시스템을 구축합니다.

### 🤖 수집 3원칙 (The Crawling Constitution) - 구현 예정
1.  **기간 존중 (Respect Period):** 할인 종료일(`sale_end_date`)이 많이 남은 게임은 불필요하게 재수집하지 않는다.
2.  **망루 감시 (Watchtower):** 매일 밤 '총 할인 개수'를 체크하고, 급격한 변동(Flash Sale)이 있을 때만 전체를 스캔한다.
3.  **유저 우선 (User First):** 유저가 '찜'한 게임은 위 규칙을 무시하고 무조건 최신 상태를 유지한다.

---

## 5. 트러블슈팅 (Troubleshooting Log)

### 💥 Issue 1: 복합 상품 가격 파싱 실패
* **증상:** 체험판이 기본 옵션인 경우 가격을 못 찾고 0원으로 인식.
* **원인:** 첫 번째 옵션(`offer0`)만 확인했으나 실제 가격은 `offer1`에 존재.
* **해결:** `offer0` ~ `offer2`를 순회하며 유효한 가격이 존재하는 옵션을 찾도록 로직 개선.

### 💥 Issue 2: SPA 렌더링 타이밍 이슈 (StaleElement)
* **증상:** 요소를 찾았으나 데이터를 꺼내려는 순간 "요소가 사라졌다"며 에러.
* **해결:** `WebDriverWait`와 `expected_conditions`를 사용하여 요소가 DOM에 완전히 부착될 때까지 대기.

### 💥 Issue 3: 정렬 및 로딩 지연으로 인한 수집 누락 (Level 17)
* **증상:** '데스 스트랜딩 2' 등 가격이 있는 게임을 "가격 없음"으로 오판.
* **원인:** 게임 제목은 떴지만, 가격 표시 영역(`mfeCtaMain`)은 비동기로 늦게 로딩됨.
* **해결:** 제목뿐만 아니라 **'구매 버튼 영역'이 뜰 때까지 기다리는** 명시적 대기 로직(`EC.presence_of_element_located`) 추가.

### 💥 Issue 4: Docker MySQL 권한 충돌 및 접속 실패 (Level 17 Infra)
* **증상:** MySQL 컨테이너가 실행 직후 `OS errno 1 - Operation not permitted` 에러를 뱉으며 종료됨. Adminer 접속 불가.
* **원인:** WSL(Windows) 파일 시스템을 리눅스 컨테이너의 `/var/lib/mysql`에 직접 마운트(Bind Mount) 할 경우, 권한 설정 충돌로 MySQL이 구동되지 않음.
* **해결:** 로컬 경로(`- ./data/mysql`) 대신 **Docker Named Volume**(`- db_data:/var/lib/mysql`) 방식을 채택하여 권한 문제 해결 및 I/O 성능 확보.

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

### ④ Data Verification
- Adminer 접속: `http://localhost:8090`
- System: MySQL / Server: `mysql` / User: `user` / PW: `password`
- `games` 및 `game_price_history` 테이블 데이터 확인.