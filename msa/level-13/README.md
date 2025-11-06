# MSA Level 13: 함대 상태 종합 보고 (Centralized Logging - ELK Stack)

지금까지 우리는 `gateway`, `user`, `order` 등 여러 척의 배(마이크로서비스)를 건조했다. 하지만 이 배들은 각자의 선실(서버)에서만 항해 일지(로그)를 기록했다.

문제가 발생하면, 선장(개발자)은 `order-service` 선실에 뛰어 들어가 로그 파일을 뒤지고, 다시 `user-service` 선실로 달려가 로그를 대조해야 하는, 비효율의 극치를 달리고 있었다.

Level 13의 목표는 이 모든 로그를 한곳에 모아, '선장'이 '중앙 통제실'에서 모든 함대의 상황을 검색하고 분석할 수 있는 **'관측 가능성(Observability)'**의 첫 번째 기둥, **'중앙 로깅 시스템'**을 구축하는 것이다.

---

### 1. The 'What': ELK 스택 (중앙 관제탑 3인방)

이 목표를 달성하기 위해 업계 표준인 'ELK 스택'을 `docker-compose`를 이용해 구축했다.

| 컴포넌트 | 역할 (The 'Role') | 비유 (The 'Analogy') |
| :--- | :--- | :--- |
| **E**lasticsearch | **저장/검색 엔진** | 모든 로그를 저장하고 0.1초 만에 검색하는 **'중앙 서고'** |
| **L**ogstash | **수집/가공 파이프라인** | 각 서버의 로그 파일을 수집하고 '구조화'하는 **'정보 수집관'** |
| **K**ibana | **시각화 대시보드** | 수집된 데이터를 차트와 대시보드로 보여주는 **'중앙 통제실 모니터'** |

---

### 2. The 'How': 로그 파이프라인 구축

단순히 ELK를 띄우는 것을 넘어, Spring Boot 3 로그를 '구조화'하여 저장하는 것이 핵심이었다.

#### 1단계: Docker Compose 자원 분리 (실무적 접근)

ELK 스택, 특히 Elasticsearch는 '자원 괴물(Resource Monster)'로, 로컬 PC에서 막대한 RAM과 CPU를 소모한다.

평소 `RabbitMQ`, `Zipkin` (경량 인프라)만 필요한 개발 작업과, '로그 분석' (중량 인프라)이 필요한 작업을 분리하기 위해 `docker-compose` 파일을 2개로 분리하는 '표준 전략'을 채택했다.

* **`docker-compose-infra.yml`**: (기존) RabbitMQ, Zipkin 등 가벼운 '필수' 인프라.
* **`docker-compose-elk.yml`**: (신규) Elasticsearch, Logstash, Kibana 등 무거운 '선택' 인프라.

> **Why?** '선장'은 오늘의 작업 목적에 따라 `docker compose -f ...` 명령어로 인프라를 '선택적'으로 띄워, 로컬 개발 환경(DX)의 속도 저하를 방지해야 한다.

#### 2단계: ELK 스택 기동 (`docker-compose-elk.yml`)

* `elasticsearch`, `logstash`, `kibana` 세 가지 서비스를 Docker Compose로 정의하여 실행했다.
* (WSL 2 환경) `docker-compose-elk.yml`의 Logstash 볼륨에 Windows 경로(`C:\...`)를 마운트하기 위해 `/mnt/c/var/log/msa-logs:/var/log/msa-logs` 경로를 사용했다.

#### 3단계: 로그 형식 통일 (`application.yml`)

`logstash`가 모든 서비스의 로그를 동일한 패턴으로 인식하도록, `back-end-lab` 공통 설정에서 **모든 로그 형식을 '강제로' 통일**했다.

* **핵심:** `logging.pattern.console`과 `logging.pattern.file`을 명시적으로 지정하여, Spring Boot의 '기본 로그 패턴'이 `_grokparsefailure`를 유발하는 것을 원천 차단했다.

```yaml
# back-end-lab/application.yml (공통 설정)

# 1. 재사용을 위한 커스텀 패턴 정의
custom-log-pattern: "%5p [${spring.application.name:},%X{traceId:-},%X{spanId:-}] %m%n"

logging:
  pattern:
    # 2. 콘솔과 파일 모두에 커스텀 패턴을 '명시적'으로 적용
    console: ${custom-log-pattern}
  file:
    name: /var/log/msa-logs/${spring.application.name}.log
    pattern: ${custom-log-pattern}
```

#### 4단계: 로그 파일 생성 및 마운트
- `logging.file.name`: `${spring.application.name}.log` 변수를 사용해, 서비스별(`order-service.log` 등)로 로그 파일을 생성하도록 했다. (기존 `spring.log` 문제 해결)

#### 5단계: 로그 구조화 (`logstash.conf`)
'정보 수집관(Logstash)'이 '통짜 문자열'로 들어온 로그를 '의미 있는 필드'로 분해하도록 grok 필터를 설정했다.
```conf
# elk-config/logstash.conf

filter {
  grok {
    # 1. application.yml의 패턴과 정확히 일치하는 Grok 패턴
    match => { "message" => "%{LOGLEVEL:log.level} \[%{DATA:service.name},%{DATA:trace.id},%{DATA:span.id}\] %{GREEDYDATA:log.message}" }
  }
  mutate {
    remove_field => ["message"] # 파싱이 끝난 원본 'message' 필드 삭제
  }
}

output {
  elasticsearch {
    hosts => ["http://elasticsearch:9200"]
    index => "msa-logs-%{+YYYY.MM.dd}" # 날짜별로 '서고' 분리
  }
}
```

### 3. 최종 결과: '검색 가능한' 관제탑
이 3단계 파이프라인을 통해, 우리는 Kibana의 'Discover' 탭에서 `service.name: "order-service"` 또는 `trace.id: "690b..."` 와 같은 구조화된 쿼리로 모든 로그를 추적할 수 있는 '중앙 관제탑'을 완성했다.
