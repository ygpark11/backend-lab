package com.example.user_service.controller;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.context.config.annotation.RefreshScope;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/users")
@RefreshScope // 스프링에게 "이 컴포넌트는 애플리케이션 재시작 없이 설정을 새로고침 할 수 있다"고 알려줌
public class UserController {

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
}
