package com.example.consumer_app.consumer;

import com.example.consumer_app.dto.MyMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class KafkaConsumerService {

    // 역직렬화 성공 시 MyMessage, 실패 시 null (ErrorHandlingDeserializer)
    @KafkaListener(topics = "my-first-topic",
            groupId = "my-group",
            containerFactory = "mainListenerContainerFactory")
    public void consume(MyMessage message,
                        @Header(name = "springDeserializerExceptionValue", required = false) byte[] deserError) {

        // plain string 등으로 Json 역직렬화 실패 → message == null
        if (message == null) {
            log.warn("Deserialization failed. Throwing to trigger retry & DLT. headerErrPresent={}",
                    deserError != null);
            throw new RuntimeException("Deserialization failed (poison pill).");
        }

        if ("poison-pill".equals(message.getMessageId())) {
            log.warn("Logical poison pill detected. Throwing to trigger retry & DLT.");
            throw new RuntimeException("Logical poison pill.");
        }

        log.info("Processed message: {}", message);
    }

    @KafkaListener(topics = "my-first-topic.DLT",
            groupId = "my-group-dlt",
            containerFactory = "dltListenerContainerFactory")
    public void consumeDlt(String raw) {
        log.error("[DLT] raw payload={}", raw);
    }
}
