# 🛠️ 트러블 슈팅 로그 (Troubleshooting Log)

> **"문제 정의와 해결 과정의 기록"**
> PS-Tracker 개발 과정에서 발생한 기술적 이슈의 원인 분석과 해결책을 정리한 엔지니어링 문서입니다.

---

## 1. Architecture & System (아키텍처 및 시스템)

### 🏗️ Case 1. 저사양 환경에서의 메모리 부족(OOM) 및 프로세스 경합
* **문제 발생:** 1GB RAM(Oracle Cloud Free Tier) 환경에서 API, DB, 크롤러를 단일 서버에서 동시에 실행 시 **OOM Killer** 가 발생하여 MySQL이 강제 종료됨.
* **원인 분석:** Chrome 브라우저 실행 시 발생하는 급격한 메모리 스파이크가 JVM 및 DB가 사용해야 할 메모리 영역을 침범함.
* **해결 방안:** 물리적 서버를 **API/DB 메인 서버(Node 1)** 와 **크롤링 전용 워커 서버(Node 2)** 로 분리하여 리소스를 완벽히 격리하는 이원화 아키텍처 도입

### 🔌 Case 2. Docker 컨테이너 간 통신 실패
* **문제 발생:** 백엔드 컨테이너 내부에서 프론트엔드/타 컨테이너를 localhost로 호출 시 연결이 거부됨(Connection Refused)
* **원인 분석:** Docker 컨테이너 환경에서 localhost는 호스트 PC가 아닌 '컨테이너 자신'의 루프백 주소를 가리킴.
* **해결 방안:** Docker Compose의 서비스 명(catalog-service)을 호스트명(Hostname)으로 사용하여, Docker 내부 DNS 기반의 컨테이너 간 통신으로 변경.

### ☁️ Case 3. 클라우드 자원 할당 실패(Out of Capacity) 대응
* **문제 발생:** 오라클 클라우드 서울 리전의 ARM 고성능 인스턴스(최대 24GB) 생성 요청이 지속적으로 거부됨.
* **해결 방안:** 
  * **MVP 배포** 리소스 여유가 있는 AMD Micro(1GB RAM) 인스턴스로 우선 배포하여 서비스 라이브.
  * **이식성 확보:** 모든 환경을 Docker로 컨테이너화하여, 추후 고사양 서버 확보 시 즉각적인 마이그레이션(Migration)이 가능하도록 인프라 환경 구축.

---

## 2. Data Engineering (데이터 수집)
(초기 Selenium 기반 수집에서 Playwright 기반의 고성능 아키텍처로 진화하는 과정입니다.)

### 📄 Case 4. 화면 렌더링 지연에 따른 데이터 누락 해결
* **문제 발생:** 네트워크 지연으로 DOM 렌더링이 늦어질 경우, DOM 셀렉터가 텍스트를 찾지 못해 빈 값이 수집됨.
* **해결 방안:** 화면이 그려지길 기다리지 않고, 페이지 HTML 내부에 주입된 초기 상태 데이터 객체(Hydration JSON Data) 를 정규식으로 직접 추출하는 방식으로 변경하여 데이터 정합성 확보.

### 🔄 Case 5. 크롤러 프로세스 누적 및 메모리 관리 (Selenium 시대)
* **문제 발생:** 장시간 크롤링 시 브라우저 프로세스가 정상 종료되지 않고 누적되어 메모리 누수 발생.
* **해결 방안:** 주기적 재시작(Context Refresh) 로직 도입. 20페이지 수집마다 드라이버를 강제로 종료(quit())하고 재생성하여 메모리를 초기화.

### 🛡️ Case 6. IP 차단 및 봇 탐지 우회
* **문제 발생:** 다량의 단시간 요청 발생 시 타겟 사이트의 보안 솔루션에 의해 IP가 임시 차단됨.
* **해결 방안:** 탐지 우회 전용 라이브러리(undetected-chromedriver) 도입 및 요청 간 인간다운 패턴(Random Delay) 적용.

### 🔍 Case 7. 검색 정확도 향상을 위한 타이틀 정규화 (Normalization)
* **문제 발생:** "Dragon Ball: Sparking! Zero Sound Ultimate Edition" 등 긴 제목 검색 시 결과가 없음.
* **해결 방안:** 정규 표현식(Regex)으로 `Sound`, `Ultimate`, `Edition` 등 불필요한 수식어를 제거하고 순수 본편 제목만 추출하여 검색 엔진에 전달.

### ⚡ Case 26. 크롤링 엔진 전면 교체 (Selenium → Playwright 마이그레이션)
* **배경:** 프로젝트 초기에는 `Selenium`으로 JSON 데이터를 파싱하여 정합성을 확보했으나, 데이터 양이 늘어날수록 **속도 저하**와 **리소스 부족** 문제가 심화됨.
* **문제 발생:**
  * 수집된 데이터에 누락되는 요소가 늘어나 데이터 품질 하락(이미지, 장르 등).
  * 수집하지 못하고 넘어가는 데이터가 증가하여 전체 수집률 저하.
* **해결 방안:** **엔진 전면 교체 (Selenium → Playwright)**
  * **통신 프로토콜 변경:** 무거운 HTTP 요청 방식(WebDriver)을 버리고, 브라우저와 WebSocket으로 직접 통신하는 Playwright를 도입하여 네트워크 딜레이 제거.
  * **네트워크 자원 차단:** `Route API`를 활용해 파싱에 불필요한 미디어(이미지, 폰트, 동영상) 리소스를 원천 차단(Abort).
  * **자가 치유(Self-Healing):** 브라우저 프로세스가 응답 없음 상태일 경우 이를 감지하고 강제로 재실행하는 구조 구현. 수집 속도를 건당 3분에서 30초 내외로 단축.

### 🧟‍♂️ Case 30. Docker 환경의 좀비 프로세스 방어 및 메모리 스왑(Swap) 해결
* **배경:** 1GB RAM의 저사양 환경에서 Playwright 크롤러를 운영하던 중, 시간이 지날수록 **Block I/O가 폭증하며 서버가 멈추는(Freezing) 현상** 발생.
* **문제 발생:** 1. Playwright 엔진을 장시간 유지(Singleton)할 경우, 메모리 파편화로 인해 OS가 스왑(Swap) 영역을 과도하게 사용.
  2. 반대로 엔진을 자주 재시작하면, Docker PID 1 문제로 인해 좀비 프로세스(`chrome-headless <defunct>`)가 누적됨.
* **Cause:** * **Low Memory Constraint:** 1GB 램 환경에서는 브라우저 컨텍스트를 아무리 잘 닫아도, 엔진 프로세스 자체가 오래 떠 있는 것만으로도 리소스 부담이 됨.
  * **PID 1 Issue:** 파이썬 애플리케이션이 자식 프로세스의 종료 시그널(SIGCHLD)을 완벽하게 처리하지 못함.
* **해결 방안:**
  1. **인프라 방어 (Zombie Defense):** Docker Compose에 `init: true` 옵션을 적용하여 경량 Init 프로세스인 **Tini**를 주입하여 파이썬 애플리케이션이 놓친 좀비 프로세스를 커널 레벨에서 즉시 수거하도록 안전장치 마련.
  2. **코드 전략 (Memory Lifecycle):** **'배치 단위 프로세스 격리'** 전략 도입.
    * 엔진 인스턴스를 계속 재사용하는 대신, 10건(Batch) 단위로 엔진을 **완전히 종료(Stop)하고 재생성**하여 메모리를 강제로 초기화함.
    * 이때 발생하는 프로세스 생성/종료 비용은 감수하되, `init: true`와의 조합으로 좀비 누적을 막고 메모리 스왑 현상을 원천 차단.

### 🖼️ Case 37. PS Store 에디션·번들 상품 이미지 오추출 (Apollo Cache 구조 분석)
* **문제 발생:** 에디션(Deluxe Edition), 번들 등 기본판 외 상품 수집 시, 해당 상품의 커버 이미지가 아닌 **기본판 이미지가 공통으로 추출**되는 버그 발생.
* **원인 분석:** PS Store의 `__NEXT_DATA__` 내 Apollo 캐시에는 `GAMEHUB_COVER_ART` 역할의 이미지 항목이 두 개 존재.
  1. **concept 레벨 항목 (공통):** 페이지 상단에 위치하며, 어떤 에디션 페이지를 열어도 기본판 이미지를 반환하는 공유 캐시 항목.
  2. **personalizedMeta 항목 (상품별):** 해당 product ID와 연결된 상품별 이미지를 포함.
  * Python 정규식으로 `__NEXT_DATA__` 텍스트를 파싱할 경우, 먼저 매칭되는 concept 레벨 항목을 반환하여 항상 기본판 이미지를 가져오는 문제.
  * 추가 난관: `__APOLLO_STATE__`는 이중 직렬화된 JSON으로 `\"` / `\/` 이스케이프가 혼재하여 단순 정규식 처리 불가.
* **해결 방안:** Python 텍스트 파싱에서 **`page.evaluate()` JavaScript 방식**으로 전환.
  * `script[type="application/json"]` 태그를 전부 순회하며 해당 product ID가 포함된 스크립트를 특정.
  * 스크립트 내에서 `"id":"<psStoreId>"` 위치를 찾고, 그 이후 8,000자 내의 `personalizedMeta` → `GAMEHUB_COVER_ART` → `url` 경로로 상품별 이미지를 추출.
  * `script[type="application/json"]`은 SSR(서버사이드 렌더링) 데이터로, `domcontentloaded` 시점에 이미 파싱 완료된 상태. MFE 렌더링 타이밍 문제 없음. 기존 Python 정규식 방식은 fallback으로만 유지.
* **Result:** 에디션 A, 에디션 B, 기본판 3가지 케이스 모두 올바른 상품별 이미지 추출 확인.

---

## 3. Backend & Database (백엔드 및 DB)

### 0️⃣ Case 8. 유효하지 않은 가격(0원) 데이터 적재 방지
* **문제 발생:** 스토어의 가격 요소를 찾지 못했을 때 0원으로 DB에 저장되어 '무료 게임'으로 오인되는 크리티컬 버그 발생.
* **해결 방안:** 수집 데이터 검증 단계에서 유효한 가격 정보(> 0)가 없을 경우 즉시 로직을 중단(`return`)하는 보호 구문(Guard Clause) 추가.

### 🔠 Case 9. Lombok과 Jackson의 필드명 매핑 충돌
* **문제 발생:** 프론트엔드에서 보낸 `isPlus` boolean 필드가 DB에 정상적으로 매핑/저장되지 않음.
* **원인 분석:** Lombok이 생성하는 Getter(`isPlus()`)와 Jackson 라이브러리의 JSON 직렬화 네이밍 규칙 차이로 인한 매핑 실패.
* **해결 방안:** DTO 필드에 `@JsonProperty("isPlus")`를 명시적으로 선언하여 JSON 파싱 키 값을 고정.

### 👻 Case 10. 비동기 렌더링으로 인한 데이터 중복(Race Condition) 방지
* **문제 발생:** 가격 데이터는 동일한데 세일 종료일(`sale_end_date`)만 누락된 동일 게임 데이터가 중복 저장됨.
* **원인 분석:** 가격 텍스트보다 날짜 텍스트가 늦게 로딩됨.
* **해결 방안:** 가격 관련 모든 요소가 로딩될 때까지 기다리는 **Explicit Wait** 적용.

### ⚡ Case 27. 1GB 램 한계를 극복하는 하이브리드 캐싱 전략 (Hybrid Caching)
* **문제 발생:** 빈번한 DB 조회가 CPU 스파이크를 유발하나, 사용자별 '찜(Like)' 상태나 '투표' 같은 개인화된 동적 데이터 때문에 전체 페이지를 캐싱(Full Caching)할 수 없음.
* **해결 방안:** 
  * **Caffeine Cache 도입:** 변경 빈도가 낮은 '게임 상세 메타 정보'와 '가격 차트'는 로컬 캐시(TTL 1h)에 담아 DB I/O 부하를 제거.
  * **하이브리드 조립(Hybrid 조립):** 캐시된 정적 데이터(Game Info)를 먼저 꺼내오고, 실시간 동적 데이터(User Status)만 DB에서 조회한 뒤 Service Layer에서 하나의 응답으로 병합(Assemble)하여 반환.

### 🔄 Case 28. Spring AOP의 Self-Invocation 문제 해결
* **문제 발생:** `CatalogService` 내부에서 `@Cacheable`이 선언된 자신의 다른 메서드를 호출(`this.method`)할 경우, 스프링 캐시가 작동하지 않고 매번 DB를 찌름.
* **원인 분석:** Spring AOP는 프록시(Proxy) 기반으로 동작하므로, 클래스 내부의 메서드 간 호출(Self-invocation) 시에는 프록시 객체를 거치지 않아 캐시 어노테이션이 무시됨.
* **해결 방안:** 캐시를 적용할 읽기 전용 로직을 `GameReadService`라는 별도의 빈(Bean)으로 분리하고, 이를 주입받아 외부 호출(External Call)하는 구조로 변경하여 프록시가 정상 작동하도록 설계 개선.

### ⚡ Case 29. 검색 성능 극대화를 위한 역정규화 (Denormalization) 도입
* **배경:** 게임 할인 목록 조회 시, `Game`(메타 정보)과 `GamePriceHistory`(가격 이력) 두 테이블을 조인하여 '현재 가격'과 '할인율'을 계산해야 함.
* **문제 발생:** 목록 조회 시마다 각 게임의 '가장 최근 가격'을 찾는 서브쿼리 연산(Greatest-N-per-Group) 과 대량의 Join 연산이 발생.
  * 1GB RAM 환경에서 동시 접속 시 CPU 점유율이 급증하고, 검색 필터(예: 할인 중인 게임만 조회) 적용 시 인덱스를 타지 못해 전체 테이블 스캔(Full Scan) 발생.
* **해결 방안:** 읽기 성능(Read)을 위해 쓰기 성능(Write)과 저장 공간을 일부 희생하는 '역정규화' 감행.
  * **스키마 변경:** `current_price`, `discount_rate` 등 검색과 정렬에 필수적인 필드를 메인 테이블(`Game`)에 중복 컬럼으로 배치.
  * **단일 테이블 스캔:** 무거운 Join 연산을 완전히 제거하고 단일 테이블 조회(Single Table Scan)로 쿼리를 최적화하여 검색 응답 속도를 향상시킴
  * **데이터 동기화:** 데이터 수집(Upsert) 시점에 트랜잭션 내에서 두 테이블의 데이터를 동기화하여 정합성 보장.
  
---

## 4. DevOps & Infrastructure (데옵스 및 인프라)

### 🏗️ Case 11. SPA 프론트엔드 빌드 타임 변수 주입
* **문제 발생:** 배포 후 React 앱이 환경변수(Firebase Config 등)를 읽지 못해 연동 실패(`undefined`).
* **원인 분석:** Docker Compose의 `env_file`은 컨테이너가 뜰 때(Run-Time) 환경변수를 주입함. 반면, React(Vite)와 같은 정적(Static) 웹사이트는 소스 코드가 컴파일되는 빌드 타임(Build-Time) 에 변수가 주입되어 파일에 구워져야 함.
* **해결 방안:** Dockerfile에 `ARG`를 선언하고, GitHub Actions 빌드 파이프라인 단계에서 `--build-arg` 옵션으로 Github Secrets를 주입하도록 분리.

### 📂 Case 12. CI 환경에서의 민감한 보안 파일 처리
* **문제 발생:** `.gitignore` 에 등록되어 Github에 없는 인증 키(FCM Key 등) 파일 때문에 Github Actions 빌드 및 컨테이너 실행 실패.
* **해결 방안:** Docker Volume 마운트를 활용하여 운영 서버(Host OS) 내부에 안전하게 보관된 키 파일을 컨테이너 내부 경로로 주입(Inject)하여 보안과 실행을 모두 만족시킴.

### 🔐 Case 13. 운영체제 간 SSH 키 권한 문제
* **문제 발생:** WSL에서 `scp` 전송 시 `Permission denied` 발생.
* **원인 분석:** 윈도우 NTFS 파일 시스템은 리눅스의 `600` 권한 체계를 지원하지 않음.
* **해결 방안:** 키 파일을 WSL 리눅스 영역(`~/`)으로 복사 후 권한 변경.

### 🐳 Case 31. CI/CD 배포 시 도커 컨테이너 휘발성(Ephemeral)으로 인한 크롤러 캐시 증발
* **문제 발생:** 랭킹 수집 크롤러가 DB 조회를 줄이기 위해 생성한 로컬 캐시 수첩(`concept_map.json`)이, 코드 배포(Container Down & Up) 때마다 함께 삭제되어 매 배포 후 첫 수집 시 30분 이상의 딜레이가 발생
* **원인 분석:** 도커 컨테이너 내부의 파일 시스템은 휘발성(Ephemeral)이므로, 컨테이너가 재실행되면 내부에 쓰인 데이터도 초기화됨.
* **해결 방안:** Docker Volume 마운트를 적용하여, 크롤러의 캐시 폴더를 Host OS(Ubuntu)의 영구 디렉토리와 동기화(`- ./crawler_data:/app/data`). 배포 후에도 캐시가 영구적으로 유지되도록 아키텍처 개선.

### 🚀 Case 33. A1 ARM64 이전: 에뮬레이션 방식 vs 네이티브 빌드의 성능 격차
* **배경:** 기존 AMD 1코어 1GB RAM 서버에서 Oracle A1 ARM64(2코어, 8GB RAM)로 메인 서버(1호기) 이전. 고사양 서버로의 이전임에도 불구하고 초기 배포 후 성능 체감이 거의 없었음.
* **문제 발생:** docker-compose에 `platform: linux/arm64`를 추가하여 기존 AMD64 이미지를 A1에서 강제 실행했으나, 서버 사양 대비 API 응답속도·화면 로딩 속도에 유의미한 차이 없음.
* **원인 분석:** `platform: linux/arm64` 옵션은 AMD64로 빌드된 이미지를 ARM64 서버에서 실행할 때 **QEMU 에뮬레이터를 런타임에 상시 가동**시킨다. 모든 CPU 명령어가 실시간으로 AMD64 → ARM64로 번역되어 실제 서버 성능의 30~50%만 발휘되는 상태였음.
  * 고사양 서버로 이전했지만 '실시간 통역사'가 모든 연산을 가로막고 있던 셈.
* **해결 방안:** CI/CD에서 **멀티 아키텍처 빌드(`linux/amd64,linux/arm64`)**를 적용하여 ARM64 전용 네이티브 바이너리 이미지를 별도 빌드.
  * QEMU + Buildx를 사용해 ARM64 이미지를 CI 단계에서 미리 제작하여 Docker Hub에 푸시.
  * A1 서버는 번역기 없이 자기 언어(ARM64 명령어)로 된 이미지를 직접 실행 → 에뮬레이션 오버헤드 0.
  * docker-compose에서 `platform: linux/arm64` 제거 (네이티브 이미지이므로 불필요).
* **Result:** 재배포 즉시 백엔드 및 프론트엔드 모두 체감 속도 향상. A1 서버 자원 100% 활용 달성.
* **교훈:** 서버 스펙 업그레이드와 아키텍처에 맞는 네이티브 이미지 빌드는 별개의 작업이다. 멀티 아키텍처 빌드는 성능과 이식성(Portability)을 동시에 확보한다.

### 💥 Case 34. ARM64 크로스 빌드 시 npm QEMU 크래시 (Illegal Instruction)
* **문제 발생:** 멀티 아키텍처 이미지 빌드(`platforms: linux/amd64,linux/arm64`) 중 `npm ci` 단계에서 **4시간 36분 후** `qemu: uncaught target signal 4 (Illegal instruction)` 에러와 함께 CI/CD 파이프라인 강제 종료.
* **원인 분석:** `FROM node:22-alpine`으로 ARM64 크로스 빌드 시 QEMU가 npm/V8 엔진이 사용하는 **AMD64 전용 SIMD 명령어(AVX 등)를 에뮬레이션하지 못해** Signal 4(SIGILL) 발생. Java(Gradle)는 JVM 바이트코드 레이어 덕분에 QEMU에서도 비교적 안정적이나, npm/webpack은 네이티브 CPU 명령어를 직접 사용하기 때문에 훨씬 취약함.
* **해결 방안:** `FROM --platform=$BUILDPLATFORM node:22-alpine AS builder` 적용.
  * `$BUILDPLATFORM`은 빌드가 실행되는 CI 러너(GitHub Actions, AMD64)의 플랫폼으로 자동 설정됨.
  * Builder 스테이지(`npm ci`, `npm run build`)는 AMD64 GitHub Actions 러너 위에서 **QEMU 없이 네이티브로 실행**.
  * 빌드된 정적 파일은 Final 스테이지(Nginx ARM64 이미지)에 복사되어 ARM64 네이티브로 실행됨.
  * 로컬 `docker build .`도 `$BUILDPLATFORM`이 로컬 플랫폼으로 자동 설정되어 정상 동작 (자급자족 Dockerfile 유지).
* **Result:** 4시간 36분 크래시 → 수 분 내 빌드 완료. CI/CD 정상화.

### 🔀 Case 36. 크롤러 수평 확장: SHARD_ID 기반 샤딩 구성
* **배경:** 게임 DB가 2,500개 이상으로 증가하면서 단일 수집기로 전체 배치를 처리하는 데 14시간 이상 소요. 수집기 추가를 통한 수평 확장이 필요했으며, 기존 메인 서버(1호기 AMD)를 3호기 수집기로 재활용하는 것이 최적 방안으로 결정.
* **문제 발생:** 단순히 수집기를 두 대 띄울 경우, 두 서버가 동일한 게임 목록 전체를 중복 수집하는 문제 발생.
* **해결 방안:** `SHARD_ID` / `SHARD_TOTAL` 환경변수를 도입한 게임 목록 분할 전략.
  * Node 2 (SHARD_ID=0, SHARD_TOTAL=2): 전체 게임 중 짝수 인덱스(0, 2, 4, ...) 게임만 처리.
  * Node 3 (SHARD_ID=1, SHARD_TOTAL=2): 전체 게임 중 홀수 인덱스(1, 3, 5, ...) 게임만 처리.
  * Java 백엔드 스케줄러가 자정(00:00)에 두 수집기에 동시 배치 명령을 전송. 각 수집기는 자신의 SHARD_ID 기준으로 필터링된 목록만 수신.
  * `docker-compose-hand-3.yml` + `deploy-hand-3.yml` 워크플로우를 별도로 구성하여 3호기 독립 배포 가능.
* **Result:** 수집 처리 시간 14시간 → 7시간 이하로 단축. 향후 SHARD_TOTAL만 늘리면 추가 수집기 서버를 바로 편입 가능(수평 확장 준비 완료).

### 🔒 Case 35. SSL 인증서 관리: Nginx + Certbot에서 Caddy로 전환
* **기존 방식:** Nginx + Certbot 조합으로 Let's Encrypt 인증서 발급. crontab에서 주기적으로 `certbot renew` 및 `nginx reload`를 실행하여 갱신.
* **문제 발생:**
  * 갱신 자동화를 위한 crontab 설정이 서버마다 별도로 필요하며, A1 신규 서버 이전 시 재구성 부담 발생.
  * certbot 컨테이너, 볼륨 마운트, crontab 등 관리 포인트 분산으로 운영 복잡도 증가.
* **해결 방안:** **Caddy**로 리버스 프록시 교체.
  * Caddyfile 3줄로 HTTPS 설정 완료.
  * Let's Encrypt 인증서 발급, 갱신, HTTPS 리다이렉트를 Caddy 내부에서 **완전 자동화** (별도 crontab 불필요).
  * 기존 certbot 컨테이너, crontab 설정 전부 제거.
* **Result:** SSL 관련 운영 부담 0. 서버 이전 시 Caddyfile 1개만 복사하면 HTTPS 환경 완성.

---

## 5. Frontend & Network (프론트엔드 및 네트워크)

### 🚪 Case 15. Cross-Origin (CORS) 정책 차단
* **문제 발생:** 프론트엔드 도메인에서 API 서버(백엔드) 호출 시 브라우저 정책에 의해 차단됨.
* **해결 방안:** Spring Security 설정에 `CorsConfigurationSource`를 등록하여, 실제 운영 중인 프론트엔드 도메인과 허용할 HTTP 메서드(GET, POST, OPTIONS 등)를 명시적으로 개방.

### 🔀 Case 16. Nginx 리버스 프록시 라우팅 누락
* **문제 발생:** 구글 소셜 로그인 성공 후 콜백 URL(`.../login/oauth2/...`)로 돌아올 때 Nginx에서 404 Not Found 발생.
* **원인 분석:** 프론트엔드 정적 파일 서빙 외에, OAuth2 처리를 담당하는 백엔드로 요청을 넘겨주는 라우팅(Proxy Pass) 규칙이 누락됨.
* **해결 방안:** `nginx.conf`에 해당 콜백 경로 패턴을 추가하고 백엔드 8080 포트로 포워딩(Forwarding)하도록 설정.

### 🔗 Case 17. Axios BaseURL 하드코딩 문제
* **문제 발생:** 배포된 운영 환경의 프론트엔드에서 API 요청을 여전히 `localhost:8080`으로 전송함.
* **해결 방안:** Vite의 환경변수(`import.meta.env.MODE`)를 활용하여 개발(Development) 환경과 운영(Production) 환경에 따라 Axios의 `BaseURL`이 동적으로 할당되도록 수정.

---

## 6. External API & AI (외부 연동)

### 🤖 Case 18. Spring AI 라이브러리 호환성 문제
* **문제 발생:** `spring-ai` 라이브러리를 통해 Google Gemini 요약 기능을 호출하려 했으나, 구글 Native API 엔드포인트를 제대로 지원하지 않아 404 에러 발생.
* **해결 방안:** 무거운 추상화 라이브러리를 과감히 제거하고, Spring 3.2부터 도입된 경량화된 `RestClient`를 사용하여 Google API를 직접(Direct) 호출하는 방식으로 전환.

### 📉 Case 19. 외부 API 무료 할당량(Quota) 제한 전략적 대응
* **문제 발생:** 런칭 초기, 게임이 수집될 때마다 Gemini API(요약)를 실시간으로 호출하다 보니 무료 티어의 일일 호출 한도(RPM/RPD 제한)를 초과하여 의도한 기능 동작이 안됨.
* **해결 방안:** 실시간 처리를 포기하고, 일 단위 배치(Daily Batch) 시스템으로 전환. 매일 새벽 할당량 이내의 건수(20건)만 끊어서 순차적으로 요약본을 생성하도록 정책을 선회.

### 🧵 Case 32. JDK 21 가상 스레드 도입 시 JPA LazyInitializationException
* **문제 발생:** `CompletableFuture.supplyAsync()`를 활용해 게임 상세 조회 내 연관 게임 추천 쿼리를 가상 스레드로 병렬 처리하도록 리팩토링 후, `LazyInitializationException: could not initialize proxy - no Session` 오류 발생.
* **원인 분석:** 가상 스레드는 **부모 스레드의 `ThreadLocal`을 상속하지 않는다.** JPA 세션은 `ThreadLocal`에 바인딩되므로, 메인 스레드의 `@Transactional(readOnly = true)` 세션이 가상 스레드에 전파되지 않음. 이 상태에서 QueryDSL이 조회한 `Game` 엔티티의 `gameGenres` (Lazy 컬렉션)에 접근하는 시점에 활성 세션이 없어 예외 발생.
* **해결 방안:** 가상 스레드 전환을 계기로 엔티티 로딩 방식 자체를 재검토.
  * **DTO 프로젝션 전환:** `Game` 엔티티 대신 `QGameSearchResultDto`를 사용하는 QueryDSL 프로젝션으로 변경하여 Lazy 로딩 의존을 원천 제거.
  * **2-Query 패턴 적용:** (1) DTO 프로젝션으로 `LIMIT`이 정확히 적용된 목록 조회 → (2) 조회된 ID 목록에 대한 장르 배치 `IN` 쿼리로 분리. `fetch join + limit` 조합 시 Hibernate가 LIMIT을 무시하고 전체 로우를 메모리에 올리는 N+1 파생 문제도 함께 방지.
* **교훈:** 가상 스레드 전환 시 `ThreadLocal` 비상속 특성을 반드시 검토해야 한다. 특히 JPA 세션, Security Context 등 `ThreadLocal` 기반 컨텍스트에 의존하는 코드는 단순 `supplyAsync` 이관만으로는 동작하지 않을 수 있다.

### 🔔 Case 20. 브라우저 푸시 알림 권한 동기화
* **문제 발생:** 사용자가 알림 수신에 동의했음에도 FCM 알림이 수신되지 않음.
* **원인 분석:** 알림 권한은 DB의 계정 정보가 아니라 현재 접속 중인 '브라우저 기기' 단위로 관리됨.
* **해결 방안:** 로그인 직후 기기의 실제 권한 상태(`Notification.permission`)를 체크하여, 권한이 없을 경우 브라우저 네이티브 권한 요청 팝업을 띄우는 프론트엔드 동기화 로직 추가.