package com.example.order_service.client;

import com.example.order_service.dto.UserDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.service.annotation.GetExchange;
import reactor.core.publisher.Mono;

public interface UserServiceClient {

    @GetExchange("/{userId}/info") // user-service의 API 경로
    Mono<ResponseEntity<UserDto>> getUserInfo(@PathVariable("userId") String userId,
                                              @RequestHeader("X-Authenticated-User-ID") String authenticatedUserId);
}
