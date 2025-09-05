package com.example.review.controller;

import com.example.review.service.PostViewService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class PostController {

    private final PostViewService postViewService;

    @PostMapping("/posts/{postId}/view")
    public String recordView(@PathVariable Long postId) {
        postViewService.incrementViewCount(postId);
        return "게시물 " + postId + "의 조회수가 기록되었습니다.";
    }
}
