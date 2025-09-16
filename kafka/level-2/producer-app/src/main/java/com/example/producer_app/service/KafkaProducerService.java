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

    public void sendMessage(String topic, String message) {
        log.info("Sending message: {} to topic: {}", message, topic);
        // KafkaTemplate을 사용하여 지정된 토픽으로 메세지를 보냅니다.
        kafkaTemplate.send(topic, message);
    }
}
