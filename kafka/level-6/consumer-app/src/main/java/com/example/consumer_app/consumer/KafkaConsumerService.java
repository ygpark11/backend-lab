package com.example.consumer_app.consumer;

import com.example.consumer_app.dto.MyMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class KafkaConsumerService {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper; // Spring Boot가 자동으로 Bean으로 등록해줌

    @KafkaListener(topics = "my-first-topic", groupId = "my-group")
    public void consume(byte[] messageBytes) {
        try {
            // 1. 먼저 byte[]를 MyMessage 객체로 변환 시도
            MyMessage message = objectMapper.readValue(messageBytes, MyMessage.class);

            // 2. 변환에 성공하면, 정상 로직 수행
            log.info("Successfully processed message: {}", message.toString());

        } catch (Exception e) {
            // 3. 변환에 실패하면 (독약 메시지), 에러 로그를 남기고 DLQ로 전송
            String poisonPill = new String(messageBytes);
            log.error("Failed to process message. Sending to DLT. Poison pill: {}", poisonPill);
            kafkaTemplate.send("my-first-topic.DLT", poisonPill);
        }
    }

    @KafkaListener(topics = "my-first-topic.DLT", groupId = "my-group-dlt")
    public void consumeDlt(String message) {
        log.error("[DLT] Received message: {}", message);
    }
}