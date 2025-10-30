# 백엔드 마스터 클래스: MSA Level 11 - 효율적인 함대 통신 (HTTP Interface Client)

## 학습 목표
MSA 환경에서 서비스 간 **동기(Synchronous) 직접 호출**이 필요한 경우, `RestTemplate`보다 우수하고 논블로킹 I/O를 활용하는 **HTTP Interface Client (`WebClient` 기반)** 패턴을 적용한다. 또한, 서비스 간 호출 시 **인증 정보(JWT/사용자 ID)를 안전하게 전파**하는 방법을 구현하고 관련 문제를 해결한다.

---

## 1. 시나리오: '주문 서비스'가 '사용자 서비스' 정보 조회

**배경:** `order-service`는 주문 생성 시, `user-service`로부터 사용자의 등급 정보를 **즉시** 받아와 할인율 계산 등에 사용해야 한다. MQ를 통한 비동기 처리는 부적합하다.

**구현:** `order-service`가 HTTP Interface Client를 사용하여 `user-service`의 `/users/{userId}/info` API를 **논블로킹** 방식으로 호출한다. (호출 자체는 I/O 논블로킹, 결과 처리는 `Mono` 스트림 활용)

---

## 2. 구현 단계

### ### STEP 1: `order-service` 생성 및 기본 설정
- Spring Initializr를 사용하여 `order-service` 프로젝트 생성 (Dependencies: `Web`, `Actuator`, `Config Client`, `Eureka Client`, `Reactive Web (WebFlux)`, `Lombok`, `Security`).
- `build.gradle.kts`, `application.yml`, `backend-lab-config/order-service.yml`, `OrderServiceApplication.java` 설정 완료 (Eureka 등록 확인).

### ### STEP 2: HTTP Interface Client 설정 (`order-service`)
- `UserDto` 클래스 생성.
- `ApiClientConfig.java`: `@LoadBalanced WebClient.Builder`, `userApiWebClient`, `UserServiceClient` 빈 등록. **(주의: WebClient 자동 헤더 전파 필터는 사용하지 않음)**
- `UserServiceClient.java`: `@GetExchange`를 사용하여 호출할 API 명세 정의. **인증 헤더 전파를 위해 `@RequestHeader` 파라미터 추가 (수동 전파 방식 채택)**.

```java
// UserServiceClient.java (수동 헤더 전파 방식)
public interface UserServiceClient {
    @GetExchange("/{userId}/info")
    Mono<ResponseEntity<UserDto>> getUserInfo(
            @PathVariable("userId") String userId,
            @RequestHeader("X-Authenticated-User-ID") String authenticatedUserId // 헤더 파라미터 추가
    );
}
```

### STEP 3: API 호출 로직 구현 (`order-service`)
- `OrderService.java`: `UserServiceClient`를 주입받아 `getUserInfo` 메서드 호출. 컨트롤러로부터 받은 `authenticatedUserId`를 명시적으로 전달 (수동 전파). `WebClient` 호출 결과는 `Mono`로 받아 논블로킹 스트림으로 처리. 반환 타입은 `Mono<String>` (리액티브).
- `OrderController.java`: `Principal` 객체를 주입받아 인증된 사용자 ID(`authenticatedUserId`)를 확인하고, 이를 `OrderService`로 전달. 컨트롤러 반환 타입은 `Mono<ResponseEntity<String>>` (리액티브).

```java
// OrderController.java (리액티브 반환)
@PostMapping("/user/{userId}/product/{productId}")
public Mono<ResponseEntity<String>> createOrder(...) {
    // ... 인가 검사 ...
    return orderService.createOrder(userId, productId, authenticatedUserId) // Mono<String> 반환
        .map(ResponseEntity::ok)
        .onErrorResume(...);
}

// OrderService.java (리액티브 반환)
public Mono<String> createOrder(..., String authenticatedUserId) {
    return userServiceClient.getUserInfo(userId, authenticatedUserId) // Mono<ResponseEntity<UserDto>> 반환
        .flatMap(responseEntity -> { // 논블로킹 처리
            // ...
            return Mono.just(orderResult);
        })
        .onErrorResume(...);
}
```

### STEP 4: 내부 보안 설정 (`order-service`)
- `order-service`에도 `user-service`와 동일하게 `spring-boot-starter-security` 의존성을 추가했다.
- `RequestHeaderAuthenticationFilter` 와 `SecurityConfig` 를 `user-service`로부터 그대로 복사/적용하여, 게이트웨이가 전파한 `X-Authenticated-User-ID` 헤더를 신뢰하고 `Principal` 객체를 생성하도록 설정했다. `SecurityConfig`에는 `/user/**` 경로(게이트웨이 `RewritePath` 적용 후 경로)에 대한 `authenticated()` 규칙을 명시적으로 추가했다.

## 3. 핵심 트러블슈팅: MVC 비동기(`Mono` 반환) + SecurityContext + 재디스패치 = `403 Forbidden`
문제 상황: `OrderController`가 `Mono<ResponseEntity>` (리액티브 타입)를 반환하도록 했을 때, order-service 내부 로그는 성공(200 OK)이었으나 클라이언트는 최종적으로 `403 Forbidden` 응답을 받았다.

원인 분석 (재디스패치 함정):
1. 컨트롤러가 `Mono`를 반환하면 Spring MVC는 서블릿 비동기(Servlet Async) 모드로 전환하고 초기 요청 스레드를 반납한다. 이때 초기 스레드의 `SecurityContextHolder`에는 `RequestHeaderAuthenticationFilter`가 설정한 인증 정보가 들어있다.

2. `Mono`가 완료된 후 실제 응답을 보내기 위해, 서블릿 컨테이너는 다른 스레드에서 요청을 **재디스패치(redispatch)**한다.

3. `OncePerRequestFilter`(`RequestHeaderAuthenticationFilter`의 부모)는 기본적으로 재디스패치 시 다시 실행되지 않는다. (`shouldNotFilterAsyncDispatch()`가 `true`)

4. 따라서 재디스패치된 스레드의 `SecurityContextHolder`는 비어있게 된다.

5. `SecurityConfig`의 `.authenticated()` 규칙에 따라, Spring Security는 이 인증 정보 없는 재디스패치 요청을 최종적으로 `403 Forbidden` (또는 `401`)으로 차단한다.

해결책:
- `RequestHeaderAuthenticationFilter`에서 `shouldNotFilterAsyncDispatch()` 메서드를 오버라이드하여 `false`를 반환하도록 수정했다. 이렇게 하면 재디스패치 시에도 필터가 다시 실행되어 `SecurityContext`를 채워주므로, 컨트롤러에서 `Mono` 반환 타입을 유지하면서도 보안 문제를 해결할 수 있었다.

```java
// RequestHeaderAuthenticationFilter.java (수정 부분)
@Override
protected boolean shouldNotFilterAsyncDispatch() {
    // ASYNC 재디스패치 시에도 필터를 다시 실행하도록 false 반환
    return false;
}
```
이 과정을 통해 Spring MVC의 비동기 처리 방식과 Spring Security 필터 체인, 특히 재디스패치 시의 보안 컨텍스트 전파 문제를 해결하는 방법을 깊이 있게 이해할 수 있었다.
