package com.example.consumer_app.consumer;

import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class KafkaConsumerService {

    // topics = "구독할 토픽 이름", groupId = "소속될 컨슈머 그룹 ID"
    @KafkaListener(topics = "my-first-topic", groupId = "my-group")
    public void consume(String message) {
        log.info("Consumed message: {}", message);
    }
}
