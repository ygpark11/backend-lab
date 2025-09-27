package com.example.reactive_practice.kafka;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class KafkaConsumer {

    @KafkaListener(topics = "my-topic", groupId = "my-group")
    // 파라미터 타입을 MessageDto로 변경
    public void listen(MessageDto message) {
        System.out.println("📥 메시지 수신: " + message.toString());
    }
}