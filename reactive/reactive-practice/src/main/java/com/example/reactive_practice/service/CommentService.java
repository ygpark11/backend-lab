package com.example.reactive_practice.service;

import com.example.reactive_practice.domain.Comment;
import com.example.reactive_practice.event.CommentEventBus;
import com.example.reactive_practice.repository.CommentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Slf4j
@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final CommentEventBus commentEventBus;

    public Mono<Comment> saveComment(Comment comment) {
        // 1. DB에 댓글 저장을 시도
        return commentRepository.save(comment)
                .doOnSuccess(savedComment -> { // 2. 저장이 성공하면,
                    log.info("✅ DB 저장 성공, 이벤트 발행: {}", savedComment);
                    // 3. 이벤트 버스에 '저장된 댓글' 이벤트를 발행
                    commentEventBus.publishEvent(savedComment);
                });
    }
}
