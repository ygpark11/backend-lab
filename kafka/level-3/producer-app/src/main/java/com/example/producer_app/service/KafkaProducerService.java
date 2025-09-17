package com.example.producer_app.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class KafkaProducerService {

    // 스프링이 자동으로 주입해주는, 카프카에 메세지를 보내기 위한 도구
    private final KafkaTemplate<String, String> kafkaTemplate;

    public void sendMessage(String topic, String key, String message) {
        log.info("Sending message with key: [{}], message: [{}] to topic: [{}]", key, message, topic);
        // .send() 메서드에 key를 추가하여 메시지를 보냅니다.
        kafkaTemplate.send(topic, key, message);
    }
}
