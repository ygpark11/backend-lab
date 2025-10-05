package com.example.db_lab.repository;

import com.example.db_lab.domain.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface PostRepository extends JpaRepository<Post, Long> {

    // "p.user" 부분에 "JOIN FETCH"를 사용하여 즉시 로딩하도록 지시
    @Query("SELECT p FROM Post p JOIN FETCH p.user")
    List<Post> findAllWithUser();
}
