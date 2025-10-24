package com.example.user_service.controller;

import com.example.user_service.dto.LoginRequestDto;
import com.example.user_service.dto.UserDto;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.context.config.annotation.RefreshScope;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.util.Date;

/**
 * Gateway 연동을 위한 API
 * Gateway의 RewritePath 필터와 연동하기 위해 '/users' 접두사를 제거합니다.
 * 이제 이 API는 Gateway의 라우팅 정책과 완전히 분리되어 독립적으로 동작합니다.
 */
@RestController
//@RequestMapping("/users")
@RefreshScope // 스프링에게 "이 컴포넌트는 애플리케이션 재시작 없이 설정을 새로고침 할 수 있다"고 알려줌
@Slf4j
public class UserController {

    private final RabbitTemplate rabbitTemplate;
    private final SecretKey jwtSecretKey; // JWT 비밀 키 주입

    public UserController(RabbitTemplate rabbitTemplate, @Value("${token.secret}") String secret) {
        this.rabbitTemplate = rabbitTemplate;
        // 주입받은 문자열 키를 HMAC-SHA 알고리즘에 맞는 SecretKey 객체로 변환
        this.jwtSecretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    // Config 서버에서 값을 읽어옴
    @Value("${test.message}")
    private String message;

    @GetMapping("/{id}")
    public String getUserById(@PathVariable String id) {
        return "Response from User-Service for user ID: " + id;
    }

    @GetMapping("/message")
    public String getMessage() {
        return message;
    }

    /**
     * Gateway 연동 API (수정됨: 인가 로직 추가)
     * Gateway가 추가해 준 'X-Authenticated-User-ID' 헤더를 신뢰하여,
     * 경로 변수의 userId와 헤더의 userId가 일치하는지 확인한다.
     */
    @GetMapping("/{userId}/info")
    public ResponseEntity<UserDto> getUserInfo(
            @PathVariable("userId") String userId,
            //@RequestHeader("X-Authenticated-User-ID") String authenticatedUserId // ★★★ 게이트웨이가 보낸 헤더 주입
            Principal principal // ★★★ @RequestHeader 대신 Principal 주입
    ) {
        // ★★★ Spring Security로부터 인증된 사용자 ID 가져오기
        String authenticatedUserId = principal.getName();

        // ★★★ 인가(Authorization) 로직 ★★★
        if (!userId.equals(authenticatedUserId)) {
            // 경로의 ID와 인증된 사용자 ID가 다르면 403 Forbidden 에러 반환
            log.warn("인가 실패: 사용자 {}가 사용자 {}의 정보에 접근 시도.", authenticatedUserId, userId);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "자신의 정보만 조회할 수 있습니다.");
        }

        // 인가 성공: 기존 로직 수행
        log.info("Gateway로부터 사용자 정보 요청 받음 (인가 성공): {}", userId);
        UserDto userDto = new UserDto(userId, "Gildong Hong", "gildong@example.com");
        return ResponseEntity.ok(userDto);
    }

    @GetMapping("/test-mq/{message}")
    public ResponseEntity<String> sendTestMessage(@PathVariable String message) {

        // RabbitMQConfig에서 설정한 Exchange와 Routing Key로 메시지를 발송합니다.
        rabbitTemplate.convertAndSend("user.exchange", "user.created", message);
        log.info("회원가입 메시지 발송 완료 (message: {})", message);

        String responseMessage = "Message sent to RabbitMQ: " + message;
        return ResponseEntity.ok(responseMessage);
    }

    @PostMapping("/login")
    public ResponseEntity<String> login(@RequestBody LoginRequestDto loginRequest) {

        // (임시) 실제로는 DB에서 사용자 정보를 조회하고 패스워드를 비교해야 함
        // 지금은 "test@example.com" / "1234" 만 허용
        if ("test@example.com".equals(loginRequest.getEmail()) && "1234".equals(loginRequest.getPassword())) {

            // 로그인 성공 시 JWT 생성
            String jwt = Jwts.builder()
                    .subject("test-user-id") // 토큰의 주체 (실제로는 user.getUserId())
                    .claim("email", loginRequest.getEmail()) // 비공개 클레임 (부가 정보)
                    .expiration(new Date(System.currentTimeMillis() + (60 * 60 * 1000))) // 만료 시간: 1시간
                    .signWith(jwtSecretKey) // 서명: 우리가 만든 비밀키 사용
                    .compact(); // 토큰 생성

            // 응답 헤더에 JWT를 담아서 반환
            HttpHeaders headers = new HttpHeaders();
            headers.add(HttpHeaders.AUTHORIZATION, "Bearer " + jwt);

            return ResponseEntity.ok()
                    .headers(headers)
                    .body("Login Successful. Token generated.");

        } else {
            // 로그인 실패
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Invalid email or password.");
        }
    }
}