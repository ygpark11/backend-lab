# Level 3: 서비스 간 통신

## 학습 목표
MSA 환경의 단일 진입점(Entry Point)인 API Gateway에서 내부 마이크로서비스(`user-service`)를 호출하는 두 가지 방식, **OpenFeign**과 **HTTP Interface Client**를 구현하고 비교하며, 그 과정에서 마주치는 실무적인 문제들을 해결하여 기술의 내부 동작 원리를 깊이 있게 이해한다.

---

## Phase 1: '전통의 강자' OpenFeign으로 구현하기

'선언적(Declarative) API 클라이언트'의 시대를 연 OpenFeign을 사용하여 Gateway의 필터에서 `user-service`를 호출하는 기능을 구현했다.

### ### 핵심 트러블슈팅 여정: 에러를 통해 배운 것들

단순히 구현에 성공하는 것을 넘어, 우리는 이 과정에서 MSA 실무 환경에서 반드시 마주치게 되는 고급 문제들을 해결했다. 이 경험이야말로 오늘의 핵심 자산이다.

**1. `Circular Dependency` (순환 참조) 에러**
* **문제:** `RouteLocator` → `AuthenticationFilter` → `UserServiceClient` → `RouteLocator`... 로 이어지는 빈 생성 순서의 교착 상태.
* **해결:** `AuthenticationFilter`의 생성자 주입에서 `UserServiceClient`에 **`@Lazy`** 어노테이션을 추가. "지금 당장 주입하지 말고, 실제로 처음 사용할 때 만들어서 줘"라고 지시하여 순환 고리를 끊었다.

**2. `IllegalStateException: block() is not supported` 에러**
* **문제:** **논블로킹(Non-blocking)** 세계인 Spring Cloud Gateway의 스레드에서 **블로킹(Blocking)** 방식인 OpenFeign을 직접 호출하여 발생한 '세계관 충돌'.
* **해결:** 블로킹 코드를 **`Mono.fromCallable()`**으로 감싸고, **`.subscribeOn(Schedulers.boundedElastic())`**을 통해 블로킹 I/O 전용 스레드 풀에서 작업을 실행하도록 위임했다. 리액티브 시스템에서 이질적인 코드를 통합하는 핵심 패턴을 익혔다.

**3. `FeignException$NotFound: [404]` 에러**
* **문제:** 아키텍처 개선을 위해 `user-service`의 API 경로에서 `/users`를 제거했으나, `UserServiceClient` 인터페이스에는 옛날 경로가 남아있어 발생한 주소 불일치.
* **해결:** Feign 클라이언트 인터페이스의 `@GetMapping` 경로를 실제 서비스의 최신 경로와 정확히 일치시켜 해결했다.

**4. `DecodeException` (`NoSuchBeanDefinitionException`) 에러**
* **문제:** 리액티브 기반인 Gateway는 기본적으로 OpenFeign이 JSON 응답을 객체로 변환할 때 필요한 `HttpMessageConverters` 빈을 가지고 있지 않았다.
* **해결:** `spring-boot-starter-web` 의존성을 추가하는 것은 최신 버전에서 Gateway와 충돌을 일으켰다. 대신, **필요한 빈(`HttpMessageConverters`)만 직접 `@Bean`으로 등록**하는 설정 클래스(`FeignConfig`)를 만들어 외과수술처럼 정교하게 문제를 해결했다.

---

## Phase 2: '현대의 표준' HTTP Interface Client로 리팩토링

OpenFeign 구현 과정에서 느꼈던 불편함(과도한 설정, 리액티브 코드의 복잡성)을 해결하기 위해, `WebClient` 기반의 최신 HTTP Interface Client로 전체 코드를 리팩토링했다.

### ### 주요 개선점
1.  **설정 간소화:** `@EnableFeignClients`, `@FeignClient` 등 보일러플레이트 코드가 사라지고, 모든 설정이 `@Configuration` 파일 안으로 통합되어 명확해졌다.
2.  **논블로킹 통합:** 클라이언트 자체가 논블로킹이므로, 인터페이스의 반환 타입을 **`Mono<T>`**로 선언하는 것만으로 완벽한 리액티브 스트림이 완성되었다. `Mono.fromCallable`, `subscribeOn` 같은 복잡한 코드가 완전히 사라져 필터 로직이 극적으로 단순하고 직관적으로 변했다.
3.  **확장성:** **`@LoadBalanced WebClient.Builder`**를 중앙 빈으로 등록하고 재사용하여, 여러 마이크로서비스 클라이언트를 일관되고 효율적인 패턴으로 확장할 수 있는 구조를 확립했다.

---

## 최종 비교: OpenFeign vs. HTTP Interface Client

| 항목 | OpenFeign | HTTP Interface Client (`WebClient` 기반) | 비유 |
| :--- | :--- | :--- | :--- |
| **기반 기술** | Blocking I/O (`RestTemplate`) | **Non-blocking I/O (`WebClient`)** | 내연기관 엔진 vs **전기 모터** |
| **리액티브 통합** | 부자연스러움 (`subscribeOn` 필요) | **자연스러움 (Native)** | 수동 변속기 vs **자동 변속기** |
| **설정** | 다소 많음 (`@Enable...`, `@FeignClient`) | **간결함 (Java Config로 통합)** | 여러 장의 서류 vs **하나의 설정 파일** |
| **서비스 디스커버리** | `@FeignClient(name=...)` | **`@LoadBalanced WebClient.Builder`** | 개별 주소록 vs **중앙 연락처 앱** |

---

## 최종 코드 스니펫 (`gateway-service`)

### `ApiClientConfig.java`
```java
@Configuration
public class ApiClientConfig {

    @Bean
    @LoadBalanced
    public WebClient.Builder webClientBuilder() {
        return WebClient.builder();
    }

    @Bean
    public WebClient userApiWebClient(WebClient.Builder webClientBuilder) {
        return webClientBuilder
                .baseUrl("http://user-service")
                .build();
    }

    @Bean
    public UserServiceClient userServiceClient(WebClient userApiWebClient) {
        HttpServiceProxyFactory factory = HttpServiceProxyFactory
                .builderFor(WebClientAdapter.create(userApiWebClient))
                .build();
        return factory.createClient(UserServiceClient.class);
    }
}
```

### `UserServiceClient.java`
```java
public interface UserServiceClient {
    @GetExchange("/{userId}/info")
    Mono<ResponseEntity<UserDto>> getUserInfo(@PathVariable("userId") String userId);
}
```

### `AuthenticationFilter.java` (핵심 로직)
```java
// ...
return userServiceClient.getUserInfo(userId)
    .flatMap(responseEntity -> {
        log.info("사용자 정보 조회 성공 (WebClient). 응답 상태 코드: {}", responseEntity.getStatusCode());
        return chain.filter(exchange);
    })
            .onErrorResume(e -> {
        log.error("user-service 호출 실패 (WebClient): ", e);
        return onError(exchange, "User service call failed", HttpStatus.INTERNAL_SERVER_ERROR);
    });
// ...
```

