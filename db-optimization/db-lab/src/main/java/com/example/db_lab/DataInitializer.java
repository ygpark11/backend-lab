package com.example.db_lab;

import com.example.db_lab.domain.User;
import com.example.db_lab.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    // private final PostRepository postRepository;

    @Override
    public void run(String... args) throws Exception {
        System.out.println("대용량 테스트 데이터 초기화를 시작합니다...");
        long startTime = System.currentTimeMillis();

        // postRepository.deleteAllInBatch(); // 1. 이 줄을 삭제 또는 주석 처리
        //userRepository.deleteAllInBatch(); // 2. User 테이블 삭제는 남겨두거나 삭제해도 됨

        List<User> users = new ArrayList<>();
        for (int i = 1; i <= 100000; i++) {
            users.add(new User("user" + i, "user" + i + "@example.com"));
        }
        userRepository.saveAll(users);

        long endTime = System.currentTimeMillis();
        System.out.println(">> 데이터 초기화 완료! (총 " + (endTime - startTime) + "ms 소요)");
    }

    // N+1 문제 테스트를 위한 데이터 초기화
    /*@Override
    public void run(String... args) throws Exception {
        System.out.println("N+1 문제 테스트 데이터 초기화를 시작합니다...");

        // 기존 데이터 모두 삭제
        postRepository.deleteAll();
        userRepository.deleteAll();

        // 10명의 사용자 생성
        List<User> users = new ArrayList<>();
        for (int i = 1; i <= 10; i++) {
            users.add(new User("user" + i, "user" + i + "@example.com"));
        }
        userRepository.saveAll(users);

        // 각 사용자가 2개의 게시물 작성
        List<Post> posts = new ArrayList<>();
        for (User user : users) {
            posts.add(new Post("title1 by " + user.getName(), user));
            posts.add(new Post("title2 by " + user.getName(), user));
        }
        postRepository.saveAll(posts);

        System.out.println("데이터 초기화 완료!");
    }*/
}
