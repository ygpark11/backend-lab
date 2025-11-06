# MSA Level 13: 'Trace ID 유실' 트러블슈팅 (Reactor Context Propagation)

Level 13의 '중앙 관제탑'은 완성되었지만, 관제탑 모니터(Kibana)에 가장 중요한 `trace.id` 필드가 `null` (,,)로 찍히는 심각한 'Context 유실' 문제를 마주했다.

`[Gateway] INFO [gateway-service,,] JWT validation successful`
`[Order] INFO [order-service,,] [WEBCLIENT][RES] status=200 OK`

이 문제는 Spring Boot 2 (Sleuth)의 '마법'이 사라진 **Spring Boot 3 (Micrometer Tracing)** 환경에서, **'Reactive' 스택의 `ThreadLocal` Context를 어떻게 전파할 것인가**라는 '근본 원인'을 가리키고 있었다.

이 트러블슈팅은 Level 13의 '진짜 배움'이었다.

---

### 1. The 'Why': 3단계에 걸친 `Trace ID` 유실

'선장'의 관점에서 우리가 겪은 `trace_id` 유실 현상은 3가지 복합적인 원인으로 발생했다.

| 문제 지점 | 근본 원인 (The 'Why') | 비유 (Analogy) |
| :--- | :--- | :--- |
| **1. Gateway 로그** (`[gateway,,]`) | **필터 실행 순서:** 우리의 커스텀 필터(`getOrder=-1`)가 Spring의 Tracing 필터(`order=-1`)보다 먼저 실행됨. | "택배 기사가 '송장'을 붙이기도 전에, 경비원이 '송장 없음'이라고 기록한 셈." |
| **2. `WebClient` 응답** (`[RES],,`) | **Reactor Context 유실:** `WebClient`는 비동기. 응답을 받는 스레드(B)가 요청 스레드(A)와 다름. `Trace ID`가 `ThreadLocal`에서 자동으로 전파되지 않음. | "A차선에서 B차선으로 옮길 때, 차에 붙인 '추적 스티커'가 떨어져 버림." |
| **3. 모든 로그** (`grok` 파싱) | **MDC의 ThreadLocal 한계:** 로그 패턴(`%X{traceId}`)은 `MDC`를 참조. MDC는 `ThreadLocal` 기반이라 비동기 스레드에서 `null`이 됨. | "로그에 찍히는 '주소 라벨'이 현재 스레드(A)에만 붙어있어, B 스레드는 라벨을 못 읽음." |

---

### 2. The 'How': '명시적인' Context 전파 4단계

이 복합적인 문제를 해결하기 위해, 우리는 '마법'이 아닌 '명시적인 설정'을 통해 '부품'을 장착하고 '스위치'를 켜는 4단계 표준 절차를 수행했다.

#### 1단계: 의존성 추가 (핵심 부품 장착)

모든 서비스(`gateway`, `order`, `user`)의 `build.gradle`에 Tracing과 Context 전파에 필요한 '표준 부품' 5종 세트를 동일하게 적용했다.

```gradle
// build.gradle (모든 서비스 공통 적용)

// Micrometer Tracing (Brave + Zipkin)
implementation 'io.micrometer:micrometer-tracing-bridge-brave'
implementation 'io.zipkin.reporter2:zipkin-reporter-brave'
implementation 'io.zipkin.reporter2:zipkin-sender-urlconnection'

// ★★★ Reactor 비동기 컨텍스트 전파 (Trace ID 유실 방지) ★★★
implementation 'io.micrometer:context-propagation' // 1. 도구 상자
implementation 'io.projectreactor:reactor-core-micrometer' // 2. 연결 다리
```

#### 2단계: Reactor Context 자동 전파 (전역 스위치 켜기)
'부품'이 Reactor의 모든 비동기 스레드 변경(map, flatMap 등)을 자동으로 따라다니도록 '전역 자동화 스위치'를 켰다.
이 Initializer는 모든 Reactive 서비스(gateway-service, order-service)에 추가했다.

```java
// ReactorContextPropagationInitializer.java

@Component
public class ReactorContextPropagationInitializer {
    @PostConstruct
    public void init() {
        // ★★★ 이 한 줄이 Reactor의 'Context 자동 이사'를 활성화 ★★★
        Hooks.enableAutomaticContextPropagation();
    }
}
```

#### 3단계: Gateway 필터 순서 조정 (순서 양보)
`gateway-service`에서 `Trace ID`가 '생성되기도 전에' 로그를 찍는 문제를 해결하기 위해, 우리 필터의 실행 순서를 Spring의 Tracing 필터(-1)보다 '뒤로' 미뤘다.

```java
// GlobalRequestFilter.java

@Override
public int getOrder() {
    // Spring Tracing 필터(-1)가 Context를 먼저 생성하도록 '양보'
    return 10; 
}
```

#### 4단계: `WebClient` 응답 '수동 복원' (경계 지점 처리)
'자동화 스위치(`Hooks`)'만으로는 `WebClient`의 '응답'이라는 경계 지점에서 Context가 유실될 수 있다. `order-service`의 `ApiClientConfig`에서 `ContextSnapshotFactory`를 사용해 '수동으로' Context를 복원하여 `[RES]` 로그를 찍도록 보장했다.

```java
// ApiClientConfig.java (order-service)

@Bean
public ContextSnapshotFactory contextSnapshotFactory() {
    return ContextSnapshotFactory.builder().build();
}

@Bean
public WebClient userApiWebClient(WebClient.Builder webClientBuilder, ContextSnapshotLFactory snapshotFactory) {
    return webClientBuilder
            .baseUrl("http://user-service")
            .filter(lbFilter) // (LoadBalancer 필터 적용)
            .filter((request, next) -> {
                log.info("[WEBCLIENT][REQ] {} {}", request.method(), request.url());
                return next.exchange(request)
                        .doOnEach(signal -> { // (응답/에러 시)
                            // ★★★ 응답 스레드에서 Context 수동 복원 ★★★
                            if (signal.isOnNext() || signal.isOnError()) {
                                try (ContextSnapshot.Scope scope =
                                             snapshotFactory.captureFrom(signal.getContextView()).setThreadLocals()) {
                                    
                                    if (signal.isOnNext()) {
                                        log.info("[WEBCLIENT][RES] status={}", signal.get().statusCode());
                                    } else if (signal.isOnError()) {
                                        // ... (에러 로깅) ...
                                    }
                                }
                            }
                        });
            })
            .build();
}
```

### 3. 핵심지식
이 복잡한 트러블슈팅은 '택배 배송' 비유로 요약할 수 있다.

| 개념 | 비유 (Analogy) |
| :--- | :--- |
| **`trace_id`** | **"택배 송장번호"** — 요청이 어디로 가는지 추적 |
| **`span_id`** | **"현재 위치"** — 요청이 어느 구간(서비스)에 있는지 표시 |
| **Reactor Context** | **"송장 정보를 담은 상자"** — 스레드(차선)가 바뀔 때 함께 옮겨야 함 |
| **MDC** | **"로그에 찍히는 주소 라벨"** — `trace_id`를 로그로 보이게 함 (현재 스레드 기준) |
| **`Hooks...()`** | **"상자 자동 이사 서비스"** — 스레드가 바뀌어도 송장이 자동으로 이동 |

### 4. 🎯 최종 결론
`gateway-service`와 `order-service`에서 `Trace ID`가 유실된 근본 원인은 `필터 실행 순서`와 `Reactor Context 자동 전파`가 Spring Boot 3에서 '명시적'으로 관리되어야 했기 때문이다.

`getOrder() = 10` (순서 조정)과 `Hooks.enableAutomaticContextPropagation()` (자동 전파) 및 `ContextSnapshotFactory` (수동 복원) 조합으로 이 문제를 완벽하게 해결했다.

이제 모든 로그는 Kibana와 Zipkin에서 동일한 `trace_id`로 연결되어, End-to-End 추적이 가능한 '완벽한 관제탑'이 완성되었다. ✅
