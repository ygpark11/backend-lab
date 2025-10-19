package com.example.user_service.controller;

import com.example.user_service.dto.UserDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.context.config.annotation.RefreshScope;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

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

    public UserController(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
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

    @GetMapping("/{userId}/info")
    public ResponseEntity<UserDto> getUserInfo(@PathVariable("userId") String userId) {
        // 실제로는 DB에서 조회해야 하지만, 지금은 테스트용 데이터 반환
        System.out.println("Gateway로부터 사용자 정보 요청 받음: " + userId);
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
}