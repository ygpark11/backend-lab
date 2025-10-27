Level 10 - 분산 추적 (Distributed Tracing)

## 학습 목표
MSA 환경에서 단일 요청이 여러 마이크로서비스를 거쳐 처리될 때, 전체 **요청의 흐름을 추적하고 병목 지점을 시각화**하는 **분산 추적(Distributed Tracing)** 시스템을 구축한다. Spring Boot 3.x 환경의 표준인 **Micrometer Tracing**과 **Zipkin**을 사용한다.

---

## 1. '왜?' 분산 추적이 필요한가: '사라진 요청' 문제

MSA에서는 하나의 기능을 위해 `Gateway` → `Service A` → `Service B`처럼 여러 서비스가 연쇄적으로 호출된다. 만약 `Service B`에서 에러가 발생했을 때, 각 서비스의 로그만으로는 이 요청이 어디서 시작되었고, `Service A`까지는 성공했는지 등을 **한눈에 파악하기 매우 어렵다.** 디버깅과 성능 분석에 엄청난 시간이 소요된다.



---

## 2. 해결책: '스마트 택배 운송장' (Micrometer Tracing + Zipkin)

분산 추적은 각 요청에 **고유한 '운송장 번호(Trace ID)'**를 발급하고, 요청이 각 서비스를 거칠 때마다 **'구간 기록(Span ID)'**을 남겨, 이 모든 정보를 **'중앙 택배 추적 시스템(Zipkin)'**에서 시각적으로 보여주는 기술이다.



- **Micrometer Tracing (with Brave):** (구 Spring Cloud Sleuth 역할) 서비스 내부에 설치되어 자동으로 Trace ID/Span ID를 생성하고 HTTP 헤더 등을 통해 다음 서비스로 전파하는 **라이브러리**.
- **Zipkin:** 여러 서비스로부터 전송된 추적 데이터를 수집하여 **시각적인 대시보드**를 제공하는 **독립 서버**.

---

## 3. 구현 단계 및 핵심 트러블슈팅: 'Actuator의 중요성'

### ### STEP 1: 의존성 추가 (모든 관련 서비스)
- `micrometer-tracing-bridge-brave` (Tracing 엔진)
- `zipkin-reporter-brave` (Zipkin 보고서 변환기)
- `zipkin-sender-urlconnection` (Zipkin 보고서 전송기)
- **(★핵심 발견★) `spring-boot-starter-actuator`**: 분산 추적 자동 설정(`Auto-configuration`)이 제대로 활성화되기 위해 **필수적인 기반 의존성**임을 확인했다. Actuator가 없으면 Tracing 관련 빈(Bean)들이 생성되지 않아 기능이 **조용히 비활성화**될 수 있다. (오류 없이)

### ### STEP 2: Zipkin 서버 실행
- `docker-compose.yml`에 `openzipkin/zipkin` 이미지를 추가하여 `9411` 포트로 실행했다.

### ### STEP 3: Zipkin 서버 주소 설정 (모든 관련 서비스)
- 중앙 설정(`yml`)에 Zipkin 데이터 수집 API 주소와 샘플링 비율을 설정했다.

```yaml
management:
  zipkin:
    tracing:
      endpoint: http://localhost:9411/api/v2/spans
  tracing:
    sampling:
      probability: 1.0 # 100% 추적 (개발용)
```

### ### STEP 4: 서비스별 테스트 및 검증
- `Gateway`를 통해 내부 서비스 API를 호출한 뒤, `http://localhost:9411`에서 요청의 전체 흐름(Trace)이 `gateway-service`부터 시작하여 모든 경유 서비스를 포함하여 시각화되는 것을 확인했다.