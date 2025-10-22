# Level 7 - 인증 및 인가 (JWT on Gateway)

## 학습 목표
MSA 환경의 '정문'인 API Gateway에 **상태 없는(Stateless) 인증 방식인 JWT(JSON Web Token)**를 도입한다.
1.  인증 서버 역할(`user-service`)에서 로그인을 통해 **JWT를 발급**한다.
2.  API Gateway(`gateway-service`)에서 수신되는 모든 요청의 **JWT를 검증**하는 필터를 구현한다.
3.  이를 통해 내부 마이크로서비스들은 인증 부담 없이 비즈니스 로직에만 집중할 수 있는 환경을 구축한다.

---

## 1. JWT 흐름: '놀이공원 VIP 손목 밴드'



1.  **발급 (로그인):** 사용자가 '매표소(인증 서버, 예: `user-service`)'에서 신원(ID/PW)을 증명하면, 위조 불가능한 **'VIP 손목 밴드(JWT)'**를 발급받는다.
2.  **전송 (클라이언트):** 사용자는 이후 모든 요청마다 이 '손목 밴드'를 **`Authorization: Bearer <JWT>`** 헤더에 담아 '정문(게이트웨이)'에 제시한다.
3.  **검증 (게이트웨이):** '정문 보안 요원(게이트웨이 필터)'은 '매표소'에 다시 물어보지 않고, 오직 손목 밴드 자체의 **서명**과 **유효 기간**만 빠르게 검증하여 통과/차단을 결정한다.
4.  **신뢰 (내부 서비스):** '놀이기구 직원(내부 서비스)'은 보안 요원이 통과시킨 모든 손님을 신뢰하고 자신의 핵심 업무에만 집중한다.

---

## 2. 구현 단계

### ### STEP 1: JWT 라이브러리 추가
- `user-service`와 `gateway-service` 양쪽에 `jjwt` 관련 의존성을 추가했다.

### ### STEP 2: JWT 발급 구현 (`user-service`)
- `user-service.yml`에 **256비트(32글자) 이상의 강력한 `token.secret`** 비밀키를 설정했다. (WeakKeyException 방지)
- `/login` API를 구현하여, 로그인 성공 시 `Jwts.builder()`를 사용해 JWT를 생성하고 `Authorization` 헤더에 담아 반환했다.

```java
// UserController.java (JWT 생성 부분)
SecretKey jwtSecretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));

String jwt = Jwts.builder()
    .subject(userId)
    .claim("email", email)
    .expiration(expirationDate)
    .signWith(jwtSecretKey)
    .compact();

HttpHeaders headers = new HttpHeaders();
headers.add(HttpHeaders.AUTHORIZATION, "Bearer " + jwt);
```

### STEP 3: JWT 검증 필터 구현 (`gateway-service`)
- `gateway-service.yml`에도 `user-service`와 `동일한 token.secret`을 설정했다.
- `AbstractGatewayFilterFactory`를 상속받는 `AuthenticationHeaderFilter`를 새로 구현했다.
  - 필터는 모든 요청에서 `Authorization` 헤더를 추출하고, `Jwts.parserBuilder()`를 사용해 JWT의 서명과 만료 시간을 검증했다.
  - `Jwts.parser().verifyWith(key).build().parseSignedClaims(jwt)`를 사용하여 토큰의 서명 및 유효성 검증
  - 검증 실패 시 `401 Unauthorized` 반환, 성공 시 `chain.filter(exchange)`로 요청 통과

```java
// AuthenticationHeaderFilter.java (JWT 검증 부분)
private boolean isJwtValid(String jwt) {
    try {
        Jwts.parser()
            .verifyWith(jwtSecretKey) // 1. 비밀키로 서명 검증
            .build()
            .parseSignedClaims(jwt); // 2. 토큰 파싱 (유효 기간 등 포함)
        return true; // 성공
    } catch (Exception e) {
        return false; // 실패
    }
}
```

### STEP 4: 필터 적용 (`gateway-service.yml`)
- 기존의 `AuthenticationFilter`(`X-USER-ID 사용`)를 제거하고, 새로 만든 `AuthenticationHeaderFilter`를 필요한 라우팅 경로(`user-service`, `coupon-service`)에 적용했다.
- 이로써 게이트웨이는 '인증' 역할에 집중하고, 내부 서비스 호출 없이 독립적으로 동작하게 되었다.

```yaml
# gateway-service.yml (필터 적용 부분)
filters:
  # - name: AuthenticationFilter # <- 제거
  - name: AuthenticationHeaderFilter # <- JWT 검증 필터 적용
  # ... (다른 필터들)
```