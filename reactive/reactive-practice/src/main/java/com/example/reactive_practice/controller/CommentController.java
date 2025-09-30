package com.example.reactive_practice.controller;

import com.example.reactive_practice.domain.Comment;
import com.example.reactive_practice.service.CommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;
    // ... 기존 UserController의 코드들

    @PostMapping("/comments")
    public Mono<Comment> createComment(@RequestBody Comment comment) {
        return commentService.saveComment(comment);
    }
}
