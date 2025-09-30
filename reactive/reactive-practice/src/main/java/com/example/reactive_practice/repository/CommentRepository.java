package com.example.reactive_practice.repository;

import com.example.reactive_practice.domain.Comment;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;

public interface CommentRepository extends ReactiveCrudRepository<Comment, Long> {
}
