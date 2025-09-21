package com.example.consumer_app.consumer;

import com.example.consumer_app.dto.MyMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

@Slf4j
@Service
public class KafkaConsumerService {

    // (1) 처리된 메시지의 uniqueId를 기록할 장부(Set)를 만듭니다.
    // 스레드 환경에서 안전하게 사용하기 위해 동기화된 Set을 사용합니다.
    private final Set<String> processedMessageIds = Collections.synchronizedSet(new HashSet<>());

    // 파라미터 타입을 String에서 MyMessage로 변경
    @KafkaListener(topics = "my-first-topic", groupId = "my-group")
    public void consume(MyMessage message) {
        // (2) 장부를 확인하여 이미 처리된 메시지인지 검사합니다.
        if (processedMessageIds.contains(message.getUniqueId())) {
            log.warn("Duplicate message detected! Skipping... Message ID: {}", message.getUniqueId());
            return; // 이미 처리된 메시지이므로, 여기서 함수를 종료합니다.
        }

        // (3) 중복이 아니라면, 메시지를 처리합니다.
        log.info("Successfully processed message: {}", message.toString());

        // (4) 처리가 완료되었으므로, 이 메시지의 ID를 장부에 기록합니다.
        processedMessageIds.add(message.getUniqueId());
    }

    @KafkaListener(topics = "my-first-topic.DLT", groupId = "my-group-dlt")
    public void consumeDlt(String message) {
        log.error("[DLT] Received message: {}", message);
    }
}
