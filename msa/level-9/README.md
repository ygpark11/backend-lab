# MSA Level 9 - Spring Security 통합

## 학습 목표
이전 Level 8에서 구현한 기초적인 인증 정보 전파 및 인가 방식을 스프링 생태계의 표준 보안 프레임워크인 **Spring Security**와 통합한다. 이를 통해 MSA 환경에서 보다 안전하고 표준적이며 확장 가능한 인증/인가 체계를 구축한다.

---

## 1. '왜?' Spring Security인가: 기존 방식의 한계

Level 8에서 `@RequestHeader("X-Authenticated-User-ID")`를 사용한 방식은 개념 학습에는 유용했지만, 다음과 같은 실무적 한계가 있었다.

1.  **비표준:** `X-Authenticated-User-ID`는 임시 헤더로, 표준적인 방식이 아니다.
2.  **보안 취약점:** 게이트웨이를 우회하여 내부 서비스에 직접 가짜 헤더를 전송할 경우 인가 로직이 뚫릴 수 있다.
3.  **기능 부족:** 역할(Role) 기반 제어 등 복잡한 인가 규칙 구현이 어렵다.

**Spring Security**는 이러한 문제를 해결하는 검증된 표준 솔루션이다.

---

## 2. 구현 단계: Gateway와 User-Service 연동

### ### STEP 1: Spring Security 의존성 추가
- `gateway-service`와 `user-service` 양쪽에 `spring-boot-starter-security` 의존성을 추가했다.

### ### STEP 2: `gateway-service` Security 설정 (`permitAll`)
- 게이트웨이에 `spring-boot-starter-security`를 추가하면 기본적으로 모든 요청을 차단하므로, 이를 해제하기 위한 설정이 필요했다.
- `@EnableWebFluxSecurity` 어노테이션과 함께 `SecurityWebFilterChain` 빈을 등록하여, `.authorizeExchange().anyExchange().permitAll()` 설정을 통해 **게이트웨이 자체는 모든 요청을 통과**시키도록 했다. 실제 인증 검사는 커스텀 필터가 담당한다.

```java
// gateway-service/config/SecurityConfig.java
@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {
    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        http
            .csrf(ServerHttpSecurity.CsrfSpec::disable)
            .authorizeExchange(exchange -> exchange
                .anyExchange().permitAll() // 모든 요청 허용
            );
        return http.build();
    }
}
```

### STEP 3: `user-service` Security 설정 (인증 요구)
- `@EnableWebSecurity` 어노테이션과 함께 `SecurityFilterChain` 빈을 등록했다.
- `/login`, `/test-mq`, `/actuator` 등 **공개 API를 제외한 모든 요청(`.anyRequest().authenticated()`)**에 대해 인증을 요구하도록 설정했다.
- CSRF 비활성화, 세션 STATELESS 설정 등 Stateless JWT 환경에 맞는 기본 설정을 적용했다.

```java
// user-service/config/SecurityConfig.java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(authorize -> authorize
                .requestMatchers("/login", "/test-mq/**", "/actuator/**").permitAll()
                .anyRequest().authenticated()
            );
        return http.build();
    }
}
```

### STEP 4: `UserController` 수정 (`Principal` 사용)
- 기존에 `@RequestHeader`로 사용자 ID를 받던 부분을 `java.security.Principal` 객체를 주입받도록 수정했다.
- `principal.getName()` 메서드를 통해 Spring Security가 (내부 메커니즘을 통해) 인식한 인증된 사용자 ID를 안전하게 가져왔다.
- 이를 통해 컨트롤러 코드가 특정 헤더 이름에 대한 의존성을 제거하고, Spring Security 표준 인터페이스를 사용하게 되었다.

```java
// UserController.java (getUserInfo 메서드 수정)
@GetMapping("/{userId}/info")
public ResponseEntity<UserDto> getUserInfo(
        @PathVariable("userId") String userId,
        Principal principal // @RequestHeader 대신 Principal 사용
) {
    String authenticatedUserId = principal.getName(); // Spring Security로부터 ID 획득

    if (!userId.equals(authenticatedUserId)) { // 인가 로직
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "...");
    }
    // ...
}
```