# 🎮 Project: PS-Tracker (PlayStation Store Intelligence Platform)

> **"잠들지 않는 감시자."**
> 플레이스테이션 게이머를 위한 **완전 자동화된 최저가 추적 및 AI 기반 추천** 플랫폼

## 1. 프로젝트 개요 (Overview)
* **Start Date:** 2025.11.23
* **Status:** Level 18 Completed (Full Automation & Dockerization)
* **Goal:** 24시간 365일, 시스템이 스스로 가격을 감시하고 데이터를 축적하는 완전 자동화 시스템 구축.

### 🎯 핵심 가치 (Value Proposition)
1.  **Automation:** 인간의 개입 없이 매일 새벽, 스스로 최신 정보를 수집하고 갱신.
2.  **Stability:** MSA 구조와 도커 컨테이너를 통해 환경에 구애받지 않는 안정적인 실행 보장.
3.  **Intelligence:** 단순 수집을 넘어, '갱신이 필요한 게임'만 선별하여 효율적으로 추적.

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
2.  **Order:** Python은 Java에게 "갱신할 타겟 리스트"를 요청 (`GET /targets`).
3.  **Execution:** Python이 **Selenium Grid**에 원격 접속하여 크롤링 수행.
4.  **Save:** 수집된 데이터는 다시 Java API (`POST /collect`)를 통해 DB에 저장.

---

## 3. 핵심 구현 내용 (Technical Details)

### ① Catalog Service (Java) - The Brain
* **Spring Scheduler:** `@Scheduled`를 사용하여 크롤링 작업을 정기적으로 트리거.
* **Targeting Logic:** '기간 존중' 원칙에 따라, 마지막 갱신일이 오래되었거나 할인 종료일이 지난 게임만 선별하여 수집기에게 전달.
* **Docker Network:** 호스트명(`collector-service`)을 통해 내부망 통신 구현.

### ② Collector Service (Python) - The Hand
* **Flask Web Server:** 단순 스크립트 실행 방식에서 벗어나, 외부 명령을 대기하는 서버 형태로 진화.
* **Selenium Grid 연동:** `webdriver.Remote`를 사용하여 로컬 크롬이 아닌 도커 내부의 원격 브라우저 제어.
* **Smart Mode:**
    * **Phase 1 (Update):** Java가 지시한 게임 우선 갱신.
    * **Phase 2 (Discovery):** 신규 게임 탐색 및 추가.

### ③ Infrastructure (Docker)
* **Docker Compose:** 5개의 컨테이너를 하나의 네트워크(`ps-network`)로 묶어 관리.
* **Volume Strategy:** MySQL 데이터 영구 보존 및 타임존(Asia/Seoul) 설정 완료.

---

## 4. 수집 정책: 3원칙 (The Crawling Constitution)

### ✅ 적용 완료 (Implemented)
1.  **기간 존중 (Respect Period):**
    * 무조건 전체를 긁지 않음. Java가 선별해 준 '갱신 대상'을 우선 처리.
    * 이미 방문한 URL은 중복 수집하지 않음.
2.  **유저 우선 (User First):**
    * (Level 19 예정) 유저가 찜한 게임은 최우선 순위로 갱신.
3.  **안전 제일 (Safety First):**
    * `StaleElementReferenceException` 방지를 위해 URL 수집과 상세 방문 로직을 엄격히 분리.
    * 과도한 트래픽 방지를 위해 수집 건수 제한(Limit) 및 딜레이(Sleep) 적용.

---

## 5. 트러블슈팅 (Troubleshooting Log)

### 💥 Issue 1: Docker 내부 통신 불가 (Connection Refused)
* **증상:** 도커 내부의 Python이 `localhost:8080`으로 Java를 호출하자 연결 실패.
* **원인:** 컨테이너 내부에서 `localhost`는 자기 자신을 의미함.
* **해결:** Docker Compose의 **Service Name**(`catalog-service`)을 호스트명으로 사용하여 DNS 기반 통신 구현.

### 💥 Issue 2: GUI 없는 리눅스에서의 Selenium 실행
* **증상:** 리눅스 컨테이너에는 화면(Display)이 없어 크롬 브라우저 실행 불가.
* **해결:** **Selenium Grid (Standalone Chrome)** 컨테이너를 별도로 띄우고, Python에서 `Remote WebDriver`로 원격 접속하여 해결.

### 💥 Issue 3: Stale Element Reference Exception
* **증상:** 목록 페이지의 요소를 루프 돌며 클릭하는 순간, DOM이 변경되어 "상한 참조" 에러 발생.
* **해결:** [탐색]과 [방문]을 분리. 목록 페이지에서 URL 문자열만 먼저 싹 긁어온 뒤(Copy), 별도로 방문하는 방식으로 로직 개선.

### 💥 Issue 4: Git 추적 문제 (venv)
* **증상:** `.gitignore` 설정 미숙으로 가상환경 폴더(`venv`)가 깃허브에 업로드됨.
* **해결:** `/venv` 슬래시 제거 후 `git rm -r --cached` 명령어를 통해 로컬 파일은 유지하고 원격 저장소에서만 삭제.

---

## 6. 실행 방법 (How to Run) - [All in One]

이제 명령어 하나로 모든 시스템이 기동됩니다.

### ① 전체 시스템 실행 (Docker Compose)
```bash
# 프로젝트 루트 폴더(msa)에서 실행
# --build: 코드 변경 사항 반영을 위해 빌드 옵션 포함
docker-compose up -d --build
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