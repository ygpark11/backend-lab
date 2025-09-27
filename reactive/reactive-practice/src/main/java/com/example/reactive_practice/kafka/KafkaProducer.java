package com.example.reactive_practice.kafka;

import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class KafkaProducer {

    // KafkaTemplate<String, String> -> <String, MessageDto>로 변경
    private final KafkaTemplate<String, MessageDto> kafkaTemplate;

    // 파라미터 타입을 MessageDto로 변경
    public void sendMessage(String topic, MessageDto message) {
        System.out.println("✅ 메시지 발송: " + message.toString());
        this.kafkaTemplate.send(topic, message);
    }
}
