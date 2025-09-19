package com.example.producer_app.service;

import com.example.producer_app.dto.MyMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class KafkaProducerService {

    // KafkaTemplate의 Value 타입을 MyMessage로 변경
    private final KafkaTemplate<String, MyMessage> kafkaTemplate;

    // String message 대신 MyMessage 객체를 파라미터로 받음
    public void sendMessage(String topic, MyMessage message) {
        log.info("Sending message: {} to topic: {}", message, topic);
        // .send() 메서드에 key를 추가하여 메시지를 보냅니다.
        kafkaTemplate.send(topic, message);
    }
}
