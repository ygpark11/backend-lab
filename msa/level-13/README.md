# MSA Level 13: 함대 상태 종합 보고 (Centralized Logging - ELK Stack)

지금까지 우리는 여러 척의 배(서비스)를 건조했다. 하지만 문제가 발생하면 각 배의 선실(서버)에 일일이 접속해 로그 파일을 뒤져야 했다.

Level 13의 목표는 이 비효율을 없애고, '선장'이 '중앙 통제실'에서 모든 함대의 로그를 한눈에 검색하고 분석할 수 있는 **'중앙 로깅 시스템'**을 구축하는 것이다.

이를 위해 업계 표준인 **ELK 스택**을 도입했다.

### 1. The 'What': ELK Stack의 역할

* **E: Elasticsearch (중앙 서고):** 모든 로그를 저장하고 초고속으로 검색하는 '검색 엔진'.
* **L: Logstash (정보 수집관):** 각 서비스의 로그 파일을 수집하고, '구조화'하여 Elasticsearch로 전송하는 '데이터 파이프라인'.
* **K: Kibana (중앙 통제실 모니터):** Elasticsearch의 데이터를 시각화하고 검색하는 '웹 UI 대시보드'.

### 2. The 'How': 구축 파이프라인

**1. ELK 스택 기동 (`docker-compose-elk.yml`)**
* `elasticsearch`, `logstash`, `kibana` 세 가지 서비스를 Docker Compose로 정의하여 실행했다.
* (WSL 2 환경) `docker-compose-elk.yml`의 Logstash 볼륨에 Windows 경로(`C:\...`)를 마운트하기 위해 `/mnt/c/var/log/msa-logs` 경로를 사용했다.

**2. Spring Boot 로그 파일 생성 (`application.yml`)**
* 모든 MSA 서비스가 로그를 '파일'로 남기도록 `back-end-lab`의 공통 `application.yml`에 다음과 같이 설정했다.
* `logging.file.name: /var/log/msa-logs/${spring.application.name}.log`
    * (이전의 `logging.file.path`와 `spring.log` 문제를 해결함)

**3. 로그 형식 통일 (`application.yml` & `gateway-service.yml`)**
* `_grokparsefailure` (파싱 실패)를 막기 위해, Spring Boot의 기본 로그 형식이 아닌 우리가 정의한 '커스텀 패턴'만 사용하도록 강제했다.
* `logging.pattern.console`과 `logging.pattern.file`에 모두 `custom-log-pattern` 변수를 명시적으로 지정했다.

**4. Logstash 로그 파싱 (`logstash.conf`)**
* Logstash가 수집한 '통짜 문자열' 로그를 의미 있는 '필드'로 분해하기 위해 `filter` 플러그인을 사용했다.
* **Grok:** `grok` 필터를 사용해 `"%{LOGLEVEL:log.level} \[%{DATA:service.name},%{DATA:trace.id},%{DATA:span.id}\] %{GREEDYDATA:log.message}"` 패턴으로 로그를 파싱했다.
* **결과:** 이 Grok 필터 덕분에 Kibana에서 `trace.id`, `service.name` 등으로 검색 및 집계가 가능해졌다.

**5. Kibana 데이터 뷰 생성**
* Kibana (`http://localhost:5601`)에 접속하여 '스택 관리 > 데이터 뷰'에서 `msa-logs-*` 인덱스 패턴을 생성하여 수집된 로그를 확인했다.

### 3. Level 10과의 연관성

중앙 로깅은 Level 10에서 배운 '분산 추적(Micrometer Tracing)'과 결합할 때 진정한 힘을 발휘한다.

`grok`으로 파싱한 `trace.id` 필드를 Kibana에서 검색하면, `Gateway` ➔ `Order` ➔ `User`로 이어진 **'단일 요청의 전체 여정'**을 한눈에 추적할 수 있다.