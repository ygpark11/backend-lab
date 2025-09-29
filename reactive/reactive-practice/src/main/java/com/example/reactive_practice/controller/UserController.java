package com.example.reactive_practice.controller;

import com.example.reactive_practice.domain.User;
import com.example.reactive_practice.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/users")
    public Flux<User> getAllUsers() {
        return userService.findAll();
    }

    @GetMapping("/users/{id}")
    public Mono<User> getUserById(@PathVariable Long id) {
        return userService.findById(id);
    }

    @PostMapping("/users")
    public Mono<User> createUser(@RequestBody User user) {
        return userService.save(user);
    }
}
