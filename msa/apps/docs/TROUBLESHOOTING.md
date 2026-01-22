# 🛠️ 트러블 슈팅 로그 (Troubleshooting Log)

> **"문제 정의와 해결 과정의 기록"**
> PS-Tracker 개발 과정에서 발생한 기술적 이슈의 원인 분석과 해결책을 정리한 엔지니어링 문서입니다.

---

## 1. Architecture & System (아키텍처 및 시스템)

### 🏗️ Case 1. 저사양 환경에서의 메모리 부족(OOM) 및 프로세스 경합
* **Problem:** 1GB RAM(Oracle Cloud Free Tier) 환경에서 API, DB, 크롤러를 동시에 실행 시 **OOM Killer**가 발생하여 MySQL이 강제 종료됨.
* **Analysis:** Chrome 브라우저 실행 시 발생하는 메모리 스파이크가 JVM 및 DB의 메모리 영역을 침범.
* **Solution:** 물리적 서버를 **API/DB 서버(Node 1)**와 **크롤링 전용 서버(Node 2)**로 분리하여 리소스 격리 구현.

### 🔌 Case 2. Docker 컨테이너 간 통신 실패
* **Problem:** 컨테이너 내부에서 `localhost` 호출 시 연결이 거부됨.
* **Cause:** 컨테이너 환경에서 `localhost`는 호스트가 아닌 컨테이너 자신을 가리킴.
* **Solution:** Docker Compose의 Service Name(`catalog-service`)을 호스트명으로 사용하여 DNS 기반 통신으로 변경.

### ☁️ Case 3. 클라우드 인스턴스 용량 부족(Out of Capacity) 대응
* **Problem:** 서울 리전의 ARM 고성능 인스턴스 생성 실패 지속.
* **Solution:**
    * **MVP 전략:** 리소스 여유가 있는 AMD Micro 인스턴스로 우선 배포.
    * **이식성 확보:** 모든 환경을 Docker화하여, 추후 고사양 서버 확보 시 즉시 마이그레이션 가능하도록 구성.

---

## 2. Data Engineering (데이터 수집)

### 📄 Case 4. 렌더링 지연에 따른 데이터 누락 해결
* **Problem:** 네트워크 지연으로 DOM 렌더링이 늦어질 경우, `find_element`가 텍스트를 찾지 못해 빈 값이 수집됨.
* **Solution:** 화면 렌더링(View)을 기다리지 않고, 페이지 내 주입된 **JSON 데이터 객체(Hydration Data)**를 직접 파싱하는 방식으로 변경하여 정합성 확보.

### 🔄 Case 5. Selenium 프로세스 누적 및 메모리 관리
* **Problem:** 장시간 크롤링 시 Chrome 프로세스가 종료되지 않고 누적되어 메모리 누수 발생.
* **Solution:** **주기적 재시작 로직** 도입. 20페이지 수집마다 드라이버를 `quit()` 하고 재생성하여 메모리를 초기화함.

### 🛡️ Case 6. IP 차단 및 봇 탐지 우회
* **Problem:** 다량의 요청 발생 시 보안 솔루션(Akamai)에 의해 IP 차단 발생.
* **Solution:** `undetected-chromedriver` 라이브러리 도입 및 요청 간 랜덤 딜레이 적용.

### 🔍 Case 7. 검색 정확도 향상을 위한 키워드 정규화
* **Problem:** "Dragon Ball: Sparking! Zero Sound Ultimate Edition" 등 긴 제목 검색 시 결과가 없음.
* **Solution:** 정규 표현식(Regex)으로 `Sound`, `Ultimate`, `Edition` 등 불필요한 수식어를 제거하고 본편 제목만 추출하여 검색.

### 💻 Case 21. CLI 환경에서의 브라우저 실행 오류 (Headless)
* **Problem:** 리눅스 서버 배포 시 `WebDriverException` 발생.
* **Cause:** GUI가 없는 환경에서 창을 띄우려 했기 때문.
* **Solution:** 운영 환경에서는 `--headless=new`, `--no-sandbox` 옵션을 적용하고, Selenium Grid를 활용하여 원격 제어.

### 🔄 Case 22. Stale Element Reference 예외 처리
* **Problem:** 루프 도중 DOM이 갱신되어 기존 Element 참조가 소실됨.
* **Solution:** 탐색 단계에서 URL 리스트만 먼저 확보(Copy)하고, 상세 수집 단계에서 해당 URL로 직접 접속(`driver.get`)하는 방식으로 분리.

### 🚫 Case 25. 설명 데이터 부재 시 UI 처리
* **Problem:** 일부 게임의 상세 설명 텍스트가 없어 화면이 비어 보임.
* **Solution:** 설명이 `null`일 경우 **[YouTube 검색]**, **[구글 검색]** 버튼을 동적으로 렌더링하여 대체 정보 제공.

---

## 3. Backend & Database (백엔드 및 DB)

### 0️⃣ Case 8. 가격 미수집(0원) 데이터 적재 방지
* **Problem:** 가격 요소를 찾지 못했을 때 0원으로 저장되어 '무료 게임'으로 오인됨.
* **Solution:** 유효한 가격 정보가 없을 경우 로직을 중단(`return`)하는 **Guard Clause** 추가.

### 🔠 Case 9. Lombok과 Jackson의 필드명 매핑 충돌
* **Problem:** DB에 `isPlus` 필드가 의도한 대로 저장되지 않음.
* **Cause:** Lombok(`isPlus()`)과 Jackson(JSON 파싱)의 Getter 네이밍 규칙 차이로 인한 매핑 실패.
* **Solution:** DTO 필드에 `@JsonProperty`를 명시하여 JSON 키 값을 고정.

### 👻 Case 10. 중복 데이터(Race Condition) 해결
* **Problem:** 가격은 동일한데 `sale_end_date`만 누락된 데이터가 중복 저장됨.
* **Cause:** 가격 텍스트보다 날짜 텍스트가 늦게 로딩됨.
* **Solution:** 가격 관련 모든 요소가 로딩될 때까지 기다리는 **Explicit Wait** 적용.

### 🗂️ Case 23. 엔티티와 DB 스키마 불일치 해결
* **Problem:** `Field 'user_id' doesn't have a default value` 에러 발생.
* **Cause:** DB 컬럼은 `user_id`이나 엔티티는 `member_id`로 매핑됨.
* **Solution:** `@JoinColumn(name="member_id")` 설정을 통해 엔티티와 실제 DB 컬럼명을 일치시킴.

---

## 4. DevOps & Infrastructure (데옵스 및 인프라)

### 🏗️ Case 11. React 빌드 타임 변수 주입 문제
* **Problem:** 배포 후 React 앱이 환경변수(Firebase Config)를 읽지 못함.
* **Cause:** React는 **빌드 시점(Build-Time)**에 변수가 치환되어야 하나, Docker Compose는 **런타임**에 주입함.
* **Solution:** Dockerfile에 `ARG`를 선언하고, GitHub Actions 빌드 단계에서 `--build-arg` 옵션으로 주입.

### 📂 Case 12. CI 환경에서의 보안 파일 누락 처리
* **Problem:** `.gitignore` 처리된 키 파일이 CI 서버에 없어 빌드 실패.
* **Solution:**
    * **배포:** Docker Volume을 통해 운영 서버의 파일을 컨테이너로 마운트.
    * **코드:** 파일 부재 시 환경변수를 읽도록 하이브리드 로직 구현.

### 🔐 Case 13. 운영체제 간 SSH 키 권한 문제
* **Problem:** WSL에서 `scp` 전송 시 `Permission denied` 발생.
* **Cause:** 윈도우 NTFS 파일 시스템은 리눅스의 `600` 권한 체계를 지원하지 않음.
* **Solution:** 키 파일을 WSL 리눅스 영역(`~/`)으로 복사 후 권한 변경.

### 🗝️ Case 14. 민감 정보 노출 방지
* **Problem:** `application.yml`에 비밀번호가 평문 노출됨.
* **Solution:** `application-secret.yml`로 분리하여 `.gitignore` 처리하고, 프로파일(`include`) 기능을 통해 로드.

### 🗑️ Case 24. 깃허브에 업로드된 venv 폴더 삭제
* **Problem:** 가상환경 폴더(`venv/`)가 원격 저장소에 업로드됨.
* **Solution:** `.gitignore` 추가 후 `git rm -r --cached venv/` 명령어로 원격 저장소에서만 삭제.

---

## 5. Frontend & Network (프론트엔드 및 네트워크)

### 🚪 Case 15. CORS 정책 설정
* **Problem:** 프론트엔드(5173)에서 백엔드(8080) 호출 시 차단됨.
* **Solution:** Spring Security에 `CorsConfigurationSource`를 등록하여 허용 도메인 및 메서드 명시.

### 🔀 Case 16. Nginx 리버스 프록시 라우팅 누락
* **Problem:** 구글 로그인 콜백 URL(`.../login/oauth2/...`)에서 404 발생.
* **Cause:** 해당 경로에 대한 Nginx 라우팅 규칙 부재.
* **Solution:** `nginx.conf`에 해당 경로를 백엔드로 포워딩하는 설정 추가.

### 🔗 Case 17. Axios BaseURL 하드코딩 문제
* **Problem:** 운영 환경에서도 `localhost`로 API를 요청함.
* **Solution:** `import.meta.env.MODE`를 활용하여 환경별(개발/운영) BaseURL 동적 할당.

---

## 6. External API & AI (외부 연동)

### 🤖 Case 18. Spring AI 라이브러리 호환성 문제
* **Problem:** `spring-ai` 라이브러리가 Google Native API 엔드포인트를 지원하지 않아 404 발생.
* **Solution:** 무거운 라이브러리 대신 `RestClient`를 사용하여 Google API를 직접 호출하는 방식으로 경량화.

### 📉 Case 19. 무료 API 할당량(Quota) 제한 대응
* **Problem:** Gemini 무료 티어의 일일 호출 제한으로 전체 요약 불가.
* **Solution:** 실시간 호출을 포기하고, **일 단위 배치(Daily Batch)**로 전환하여 하루 20건씩 처리하도록 정책 변경.

### 🔔 Case 20. 브라우저 알림 권한 처리
* **Problem:** FCM 알림이 수신되지 않음.
* **Cause:** 알림 권한은 계정이 아닌 브라우저 기기 단위로 관리됨.
* **Solution:** 로그인 직후 권한 상태(`Notification.permission`)를 체크하여 권한 요청 팝업을 띄우는 로직 추가.