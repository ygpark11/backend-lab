package com.example.reactive_practice.event;

import com.example.reactive_practice.domain.Comment;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;


@Component
public class CommentEventBus {

    // 1. Sink (이벤트 버스 본체) 생성
    private final Sinks.Many<Comment> sink = Sinks.many().multicast().onBackpressureBuffer();

    // 2. 이벤트를 발행하는 메소드
    public void publishEvent(Comment comment) {
        sink.tryEmitNext(comment);
    }

    // 3. 이벤트 스트림을 가져오는 메소드
    public Flux<Comment> getEventStream() {
        return sink.asFlux();
    }
}
