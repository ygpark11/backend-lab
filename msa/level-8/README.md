# Level 8 - 인증 정보 전파 및 인가 기초

## 학습 목표
API Gateway에서 JWT를 통해 '인증(Authentication)'된 사용자의 신원 정보를 내부 마이크로서비스로 안전하게 **전파(Propagate)**하고, 이를 기반으로 기초적인 **'인가(Authorization)'** 로직을 구현한다.

---

## 1. 문제 상황: '인증'만으로는 부족하다

이전 Level 7에서 게이트웨이에 JWT 검증 필터를 도입하여 '인증'된 요청만 통과시켰다. 하지만 다음과 같은 치명적인 문제가 남아있었다.

1.  **신원 소실:** 게이트웨이가 JWT 검증 후 요청을 전달할 때, JWT에 담긴 사용자 정보(예: User ID)가 내부 서비스에는 전달되지 않았다.
2.  **권한 부재:** 내부 서비스는 요청이 인증되었다는 사실만 알 뿐, 요청자가 **'누구'**인지 몰라 **'자신의 정보'**만 접근하도록 제한하는 등의 '인가' 로직을 구현할 수 없었다.
    * **공격 시나리오:** 'hacker'가 자신의 유효한 토큰으로 'victim'의 정보를 (`GET /users/victim/info`) 요청해도 막을 수 없었다.

---

## 2. 해결 전략: '신뢰할 수 있는 헤더'를 통한 신원 전파

게이트웨이가 JWT를 성공적으로 검증한 후, 토큰에서 추출한 사용자 ID를 **'신뢰할 수 있는 헤더'(예: `X-Authenticated-User-ID`)**에 담아 내부 서비스로 전달한다. 내부 서비스는 오직 이 헤더만을 신뢰하여 인가 처리를 수행한다.



---

## 3. 구현 단계

### ### STEP 1: `AuthenticationHeaderFilter` 업그레이드 (신원 전파)
- 게이트웨이의 `AuthenticationHeaderFilter`를 수정했다.
- JWT 검증 성공 시, `Jwts.parser()...getSubject()`를 통해 토큰에서 **사용자 ID (Subject)**를 추출했다.
- `request.mutate().header("X-Authenticated-User-ID", subject).build()` 패턴을 사용하여, **불변(Immutable)**인 기존 요청을 복제하고 **새로운 헤더를 추가**한 요청 객체를 생성했다.
- 이 수정된 요청 객체를 `chain.filter(newExchange)`로 전달하여 다음 필터 또는 서비스로 전파했다.

```java
// AuthenticationHeaderFilter.java (핵심 수정 부분)
String subject = getSubjectFromJwt(jwt); // JWT에서 subject 추출
if (subject == null) { /* ... 에러 처리 ... */ }

ServerHttpRequest newRequest = request.mutate()
        .header("X-Authenticated-User-ID", subject) // 신뢰 헤더 추가
        .build();
ServerWebExchange newExchange = exchange.mutate().request(newRequest).build();

return chain.filter(newExchange); // 수정된 요청 전달
```

### STEP 2: `UserController` 수정 (신원 확인 및 기초 인가)
- `user-service`의 `UserController`에서 `getUserInfo` 메서드를 수정했다.
- `@RequestHeader("X-Authenticated-User-ID")` 어노테이션을 사용하여 게이트웨이가 추가한 헤더 값을 직접 주입받았다.
- API 경로 변수(`@PathVariable("userId")`)와 헤더로 받은 `authenticatedUserId`를 비교하여, 일치하지 않으면 `403 Forbidden` 에러를 발생시키는 기초적인 인가 로직을 추가했다.

```java
// UserController.java (getUserInfo 메서드 수정)
@GetMapping("/{userId}/info")
public ResponseEntity<UserDto> getUserInfo(
        @PathVariable("userId") String userId,
        @RequestHeader("X-Authenticated-User-ID") String authenticatedUserId // 게이트웨이가 보낸 헤더 주입
) {
    // 인가(Authorization) 로직
    if (!userId.equals(authenticatedUserId)) {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "자신의 정보만 조회할 수 있습니다.");
    }
    // ... (기존 로직)
}
```