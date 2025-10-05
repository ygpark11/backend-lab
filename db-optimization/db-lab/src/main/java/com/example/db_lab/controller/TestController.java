package com.example.db_lab.controller;

import com.example.db_lab.domain.Post;
import com.example.db_lab.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class TestController {

    private final PostRepository postRepository;

    @GetMapping("/posts")
    public String getAllPosts() {
        System.out.println("========= Fetch Join 시작 =========");
        List<Post> posts = postRepository.findAllWithUser(); // 1. 메소드 호출 변경
        System.out.println("========= Fetch Join 종료 =========");
        return "총 " + posts.size() + "개의 게시물을 조회했습니다. 콘솔 로그를 확인하세요.";
    }
}
