# Level 4 - 장애 복원력과 서킷 브레이커

## 학습 목표
MSA 환경에서 하나의 서비스 장애가 시스템 전체로 전파되는 '장애 전파(Cascading Failures)' 현상을 이해하고, 이를 방지하기 위한 **서킷 브레이커(Circuit Breaker)** 패턴을 **Resilience4j**를 사용하여 API Gateway에 구현한다.

---

## 1. 핵심 개념: 서킷 브레이커는 '자동 두꺼비집'이다

특정 서비스(`user-service`)에 장애가 발생하여 응답이 없거나 매우 느릴 경우, 해당 서비스를 호출하는 쪽(`gateway-service`)의 자원이 고갈되어 연쇄적으로 장애가 발생할 수 있다.

서킷 브레이커는 이를 방지하기 위해, 장애를 감지하면 해당 서비스로 가는 요청을 **자동으로 차단(OPEN)**하고, 미리 정의된 **대체 응답(Fallback)**을 반환하여 시스템 전체를 보호하는 패턴이다.


### 서킷 브레이커의 3단계 상태 변화
- **`CLOSED` (닫힘):** 평소의 정상 상태. 모든 요청을 통과시킨다.
- **`OPEN` (개방):** 실패율이 임계값을 넘으면 전환. 정해진 시간(`wait-duration-in-open-state`) 동안 모든 요청을 즉시 차단하고 Fallback을 실행한다.
- **`HALF-OPEN` (반개방):** 차단 시간이 지난 후, 서비스가 복구되었는지 확인하기 위해 **시험 요청(Trial Request)**을 몇 개만 살짝 통과시켜 본다.
    - **시험 성공 시:** `CLOSED` 상태로 완전 복구.
    - **시험 실패 시:** 다시 `OPEN` 상태로 돌아가 차단 유지.

---

## 2. 구현 전략: '심층 방어(Defense in Depth)' 아키텍처

우리는 단순히 서킷 브레이커를 적용하는 것을 넘어, 두 개의 방어선을 구축하여 시스템의 안정성을 극대화했다.

### ### 1차 방어선: 프로그래밍 방식의 서킷 브레이커
- **위치:** `AuthenticationFilter` 내부.
- **역할:** 인증을 위해 `userServiceClient`를 호출하는 **'특수 경로'**를 직접 보호한다. 이 통신이 실패할 경우, `.onErrorResume()`을 통해 즉시 Fallback 응답(JSON)을 반환한다.
- **핵심:** 리액티브 환경에 맞는 **`ReactiveCircuitBreakerFactory`**를 사용하고, `.transform(it -> circuitBreaker.run(it))` 패턴으로 `Mono` 스트림에 서킷 브레이커를 적용했다.

### ### 2차 방어선: 선언적 방식의 서킷 브레이커
- **위치:** `gateway-service.yml` 파일.
- **역할:** 모든 필터를 통과한 후 최종 라우팅되는 **'일반 경로'**를 포괄적으로 보호한다. 서킷이 열리면 `fallbackUri`에 지정된 `FallbackController`를 호출하여 대체 응답(일반 텍스트)을 반환한다.

이 '이중 방어 시스템' 덕분에, 우리는 1~3번째 실패에서는 1차 방어선이, 실패가 누적되어 임계값을 넘은 4번째 요청부터는 2차 방어선이 동작하는 완벽한 심층 방어 체계를 구축할 수 있었다.

---

## 3. 최종 코드 스니펫 (`gateway-service`)

### ### `gateway-service.yml` (Resilience4j 설정)
```yaml
resilience4j.circuitbreaker:
  configs:
    default:
      # 최소 표본 수: 5건 모이기 전에는 실패율/느린호출율 평가(OPEN 전환 판단) 자체를 하지 않음
      minimum-number-of-calls: 5
      # 실패율 임계값(%): 최근 COUNT_BASED 기본 슬라이딩 윈도(기본 크기 100) 내 실패 비율이 50% 초과하면
      failure-rate-threshold: 50
      # OPEN(서킷이 열려 외부 서비스 호출 차단) 지속 시간: OPEN → 10초 경과 후 HALF_OPEN 전환
      wait-duration-in-open-state: 10s
      # 느린 호출 비율 임계값(%): 느린 호출(아래 임계시간 초과)이 윈도 내 60% 초과하면 역시 OPEN
      slow-call-rate-threshold: 60
      # 느린 호출 판정 기준: 2초 이상 소요되면 '느린 호출'로 집계 (실패와 별도 지표)
      slow-call-duration-threshold: 2s
  instances:
    # 이 서킷 브레이커의 고유 이름
    user-service-breaker:
      # 위에서 정의한 'default' 설정을 상속받아 사용
      base-config: default

spring:
  cloud:
    gateway:
      routes:
        - id: user-service-route
          uri: lb://USER-SERVICE
          # ...
          filters:
            # 2차 방어선 (선언적 서킷 브레이커)
            - name: CircuitBreaker
              args:
                name: user-service-breaker
                fallbackUri: forward:/fallback/user
            # 1차 방어선이 포함된 인증 필터
            - name: AuthenticationFilter
            - name: RewritePath
              # ...
```

### ### `AuthenticationFilter.java` (1차 방어선 구현)
```java
@Component
public class AuthenticationFilter extends AbstractGatewayFilterFactory<AuthenticationFilter.Config> {

    private final UserServiceClient userServiceClient;
    private final ReactiveCircuitBreaker circuitBreaker;

    @Autowired
    public AuthenticationFilter(@Lazy UserServiceClient userServiceClient, ReactiveCircuitBreakerFactory factory) {
        super(Config.class);
        this.userServiceClient = userServiceClient;
        this.circuitBreaker = factory.create("user-service-breaker");
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            // ... (헤더 검증 로직) ...

            return userServiceClient.getUserInfo(userId) // 1. API 호출 계획
                .transform(it -> circuitBreaker.run(it)) // 2. 서킷 브레이커 보호막 적용
                .flatMap(responseEntity -> { // 3. 성공 시 다음 필터로
                    return chain.filter(exchange);
                })
                .onErrorResume(throwable -> { // 4. 실패 시 안전망
                    // ... (로그 기록) ...
                    return handleFallback(exchange); // Fallback 응답 처리
                });
        };
    }
    
    private Mono<Void> handleFallback(ServerWebExchange exchange) {
        // ... (503 Service Unavailable + JSON 에러 메시지 반환) ...
    }
}
```

### ### `FallbackController.java` (2차 방어선 Fallback 엔드포인트)
```java
@RestController
public class FallbackController {
    @GetMapping("/fallback/user")
    public Mono<String> userServiceFallback() {
        return Mono.just("죄송합니다. 현재 사용자 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
}
```