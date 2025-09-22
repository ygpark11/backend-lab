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

    private final KafkaTemplate<String, MyMessage> myMessageKafkaTemplate;
    private final KafkaTemplate<String, String> stringKafkaTemplate;

    public void sendMessage(String topic, MyMessage message) {
        log.info("Sending message: {}", message);
        myMessageKafkaTemplate.send(topic, message);
    }

    public void sendPlainString(String topic, String message) {
        log.info("Sending plain string: {}", message);
        stringKafkaTemplate.send(topic, message);
    }
}
