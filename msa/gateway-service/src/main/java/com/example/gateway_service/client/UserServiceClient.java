package com.example.gateway_service.client;

import com.example.gateway_service.dto.UserDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.service.annotation.GetExchange;
import reactor.core.publisher.Mono;

// @FeignClient(name = "user-service") // <- Feign 전용 어노테이션은 주석
public interface UserServiceClient {

    // user-service에 있는 API 시그니처를 그대로 가져옵니다.
    /*@GetMapping("/{userId}/info")
    ResponseEntity<UserDto> getUserInfo(@PathVariable("userId") String userId);*/

    @GetExchange("/{userId}/info")
    Mono<ResponseEntity<UserDto>> getUserInfo(@PathVariable("userId") String userId);
}
