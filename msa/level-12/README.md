# MSA Level 12: 연쇄 실패 방지 (Fault Tolerance - Resilience4j)

이번 레벨에서는 MSA 환경의 가장 큰 위협 중 하나인 '연쇄 실패(Cascading Failures)'를 방지하는 '서킷 브레이커(Circuit Breaker)' 패턴을 학습했다. Spring Boot 3 환경의 표준인 **Resilience4j**를 `order-service`에 적용하여, `user-service` 장애 시 `order-service`를 보호하는 것을 목표로 했다.

---

### 1. The 'Why': 서킷 브레이커가 필요한 이유

MSA 환경에서 하나의 서비스(`user-service`)가 장애로 응답이 지연되거나 실패하면, 해당 서비스를 호출하는 `order-service`의 스레드 풀이 모두 대기 상태에 빠진다. 결국 `order-service`마저 자원이 고갈되어, `user-service`와 무관한 다른 요청까지 처리할 수 없는 '연쇄 실패'가 발생한다.

서킷 브레이커는 `order-service`와 `user-service` 사이에 '똑똑한 전기 차단기'를 두는 것과 같다.

1.  **CLOSED (정상):** 요청을 통과시키며 실패율을 감시한다.
2.  **OPEN (장애):** 실패율이 임계치를 넘으면, `user-service`로 요청을 보내지 않고 즉시 차단(Fast-Fail)한 뒤 **'대체 응답(Fallback)'**을 반환한다. (내 서비스 자원 보호)
3.  **HALF_OPEN (탐색):** 일정 시간 후, 시험 요청을 보내 `user-service`의 복구 여부를 탐색하고 `CLOSED` 또는 `OPEN`으로 상태를 변경한다.

---

### 2. The 'Challenge': AOP 방식(@CircuitBreaker)과 Reactive Stream(Mono)의 충돌

처음에는 가장 간단한 `@CircuitBreaker` 어노테이션(AOP 기반)을 `OrderService`의 `public` 메서드에 적용하려 시도했다.

**하지만 이 방식은 실패했다.**

* **원인:** Spring AOP는 메서드 **'호출 시점'**에만 동작한다.
* `OrderService`의 `createOrder` 메서드는 호출 즉시 실제 작업이 아닌, **'작업 계획서(Mono)'**를 반환하고 즉시 종료된다.
* AOP 입장에서는 '계획서'가 정상 반환되었으므로 임무가 종료된다.
* 실제 네트워크 예외(`Connection Refused` 등)는 AOP가 종료된 *이후에* WebFlux가 `Mono`를 **'구독(Subscribe)'**하는 시점에 발생하므로, AOP(서킷 브레이커)가 예외를 감지하지 못했다.

---

### 3. The 'Solution': 프로그래밍 방식의 서킷 브레이커 적용 (Reactive)

`Mono`와 같은 Reactive Stream 내부에서 발생하는 예외를 처리하기 위해서는, AOP가 아닌 **'프로그래밍 방식'**으로 스트림 내부에 직접 서킷 브레이커 로직을 심어야 한다.

`Resilience4jReactorTransformer` (제공자: `io.github.resilience4j:resilience4j-reactor`)를 사용하는 것이 Spring WebFlux 환경의 표준적인 해결책이다.

1.  `CircuitBreakerRegistry`를 `Service`에 주입받는다.
2.  `yml`에 정의된 이름으로 `CircuitBreaker` 인스턴스를 가져온다.
3.  `Mono` 스트림 체인 내부에 `.transform(CircuitBreakerOperator.of(circuitBreaker))`를 적용한다.
4.  서킷이 열리거나 예외 발생 시, `.onErrorResume()`을 사용해 Fallback 로직(대체 DTO 반환)을 수행한다.

---

### 4. The 'Refinement': '실패'와 '오류'의 정교한 분리

서킷 브레이커는 `시스템 장애(Failure)`에만 동작해야 하며, `비즈니스 오류(Error)`에는 동작하지 않아야 한다.

* **시스템 장애 (Failure):** `500` 에러, `503` 에러, `Connection Refused` 등. (-> 서킷 열려야 함)
* **비즈니스 오류 (Error):** `404 Not Found`, `400 Bad Request` 등. (-> 서킷 열리면 안 됨)

`application.yml` (중앙 Config)에 `record-exceptions`와 `ignore-exceptions`를 명시하여 이 동작을 정교하게 제어했다.

---

### 5. 최종 핵심 코드 (OrderService.java)

```java
// OrderService.java (Reactive 방식 서킷 브레이커 적용)

@Service
@Slf4j
public class OrderService {

    private final UserServiceClient userServiceClient;
    private final CircuitBreaker circuitBreaker; // (1) 주입받을 인스턴스

    // (2) Registry에서 yml에 정의된 "user-service-breaker" 인스턴스를 가져옴
    public OrderService(UserServiceClient userServiceClient,
                        CircuitBreakerRegistry circuitBreakerRegistry) {
        this.userServiceClient = userServiceClient;
        this.circuitBreaker = circuitBreakerRegistry.circuitBreaker("user-service-breaker");
    }

    public Mono<String> createOrder(String userId, String productId, String authenticatedUserId) {
        log.info("Creating order for user: {}, product: {}", userId, productId);

        // (3) user-service 호출 결과를 Mono<UserDto>로 변환
        Mono<UserDto> userDtoMono = userServiceClient.getUserInfo(userId, authenticatedUserId)
                .flatMap(responseEntity -> {
                    UserDto userDto = responseEntity.getBody();
                    if (userDto != null) {
                        return Mono.just(userDto);
                    } else {
                        log.error("User info not found for user ID: {}", userId);
                        return Mono.error(new RuntimeException("User not found"));
                    }
                })
                // (4) ★★★ AOP 대신, Mono 스트림에 직접 서킷 브레이커 적용 ★★★
                .transformDeferred(CircuitBreakerOperator.of(this.circuitBreaker))
                // (5) ★★★ 스트림 내부의 Fallback 처리 ★★★
                .onErrorResume(e -> {
                    log.warn("[Fallback] Order service fallback executed for user: {}. Error: {}",
                             userId, e.getMessage());
                    // Fallback DTO 반환
                    return Mono.just(new UserDto(userId, "Unknown User", "N/A"));
                });

        // (6) userDtoMono는 '정상 UserDto' 또는 'Fallback UserDto'를 갖게 됨
        return userDtoMono.map(userDto -> {
            log.info("User info for order: Name={}", userDto.getName());
            return String.format("Order created for %s. Product: %s",
                    userDto.getName(), productId);
        });
    }
}
```

### 6. 최종 설정 (`order-service.yml`)

```yaml
# back-end-lab/order-service.yml

resilience4j.circuitbreaker:
  configs:
    default:
      failure-rate-threshold: 50
      minimum-number-of-calls: 5
      wait-duration-in-open-state: 10s
      permitted-number-of-calls-in-half-open-state: 3
      sliding-window-type: COUNT_BASED
      sliding-window-size: 10
      
      # ★★★ '실패'로 간주할 예외 목록 ★★★
      # (Reactive 방식에서도 이 설정이 필수)
      record-exceptions:
        - java.io.IOException                # (시스템 장애 1) Connection Refused 등
        - java.util.concurrent.TimeoutException  # (시스템 장애 2) 타임아웃
        # (시스템 장애 3) 5xx, 4xx를 포함하는 WebClient 부모 예외
        - org.springframework.web.reactive.function.client.WebClientResponseException

      # ★★★ '실패'로 간주하지 "않을" 예외 목록 ★★★
      # (record-exceptions보다 우선순위가 높음)
      ignore-exceptions:
        # (비즈니스 오류) 4xx 계열은 장애가 아니므로 무시
        - org.springframework.web.reactive.function.client.WebClientResponseException$NotFound
        - org.springframework.web.reactive.function.client.WebClientResponseException$BadRequest
        - org.springframework.web.reactive.function.client.WebClientResponseException$Unauthorized
        - org.springframework.web.reactive.function.client.WebClientResponseException$Forbidden
```