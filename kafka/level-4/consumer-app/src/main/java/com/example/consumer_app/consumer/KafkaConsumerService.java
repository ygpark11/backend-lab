package com.example.consumer_app.consumer;

import com.example.consumer_app.dto.MyMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class KafkaConsumerService {

    // 파라미터 타입을 String에서 MyMessage로 변경
    @KafkaListener(topics = "my-first-topic", groupId = "my-group")
    public void consume(MyMessage message) {
        log.info("Received message: {}", message.toString());
    }
}
