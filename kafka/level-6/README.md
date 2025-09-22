# 카프카(Kafka) 학습 - Level 6: 에러 처리와 Dead Letter Queue (DLQ)

## 1. 핵심 개념 정리
- **독약 메시지 (Poison Pill)**: 컨슈머가 처리할 수 없는 형식의 메시지. 이 메시지 하나가 전체 메시지 파이프라인을 막는 것을 방지해야 한다.
- **Dead Letter Queue (DLQ)**: 처리 실패한 메시지를 격리시키는 별도의 '불량품 보관함' 토픽. 이를 통해 정상적인 메시지들은 계속 처리될 수 있으며, 개발자는 나중에 DLQ에 쌓인 메시지를 분석하여 문제의 원인을 파악할 수 있다.
- **에러 처리 방식**:
    - **자동 방식**: 스프링 카프카의 `DefaultErrorHandler`를 사용하여 재시도(Retry)와 DLQ 전송을 선언적으로 설정하는 방법. 매우 강력하지만, 설정이 복잡하고 내부 동작이 추상화되어 있어 디버깅이 어려울 수 있다.
    - **수동 방식**: `@KafkaListener` 내에 `try-catch` 구문을 사용하여, 에러 발생 시 DLQ 토픽으로 직접 메시지를 보내는 방법. 코드는 길어지지만, 동작 방식이 명확하고 제어하기 쉽다.

---
## 2. 도전: '자동' DLQ 구현과 미스터리

처음에는 `DefaultErrorHandler`와 `ErrorHandlingDeserializer`를 조합한 '자동' 방식으로 DLQ를 구현하고자 했다. 이 방식은 실무에서 권장되는 표준적인 방법이기 때문이다.

하지만 `ClassNotFoundException`, `NullPointerException`, `SerializationException`, `BeanCreationException` 등 연쇄적으로 발생하는 복잡한 오류들과 마주쳤다. 모든 설정을 이론적으로 완벽하게 맞췄음에도, 마지막 단계인 DLQ 메시지 발행이 계속 실패하는 예측 불가능한 문제에 부딪혔다.

이 끈질긴 디버깅 과정을 통해, 우리는 프레임워크의 '마법' 같은 자동화 기능이 때로는 환경과 라이브러리 버전의 미묘한 차이로 인해 얼마나 예측하기 어렵게 동작할 수 있는지 직접 경험했다.

---
## 3. 해결: '수동' DLQ를 통한 원리 증명

복잡한 자동 설정과의 싸움을 멈추고, `try-catch`를 이용한 '수동' DLQ 구현으로 전략을 변경했다.

### 3-1. `consumer-app/application.yml`
```yaml
# Consumer Record의 Value를 byte[]로 받아야 try-catch에서 처리가 가능
value-deserializer: org.apache.kafka.common.serialization.ByteArrayDeserializer
```

### 3-2. `KafkaConsumerService.java`
```java
@Service
@RequiredArgsConstructor
public class KafkaConsumerService {
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "my-first-topic", groupId = "my-group")
    public void consume(byte[] messageBytes) {
        try {
            MyMessage message = objectMapper.readValue(messageBytes, MyMessage.class);
            log.info("Successfully processed message: {}", message.toString());
        } catch (Exception e) {
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
```
이 접근법을 통해, 우리는 DLQ의 가장 근본적인 원리("메시지 처리 실패 시, 그 메시지를 다른 토픽으로 보낸다")를 명확하고 직관적인 코드로 직접 구현하고 마침내 성공시켰다.
---
## 4. 학습한 내용 및 교훈
- 스프링 카프카의 DefaultErrorHandler를 이용한 자동 에러 처리 방식의 복잡성과 강력함을 동시에 이해했다.

- 가장 중요한 교훈: 프레임워크의 자동화된 기능이 예측 불가능하게 동작할 때, 때로는 더 단순하고 명시적인 '수동' 구현이 문제 해결과 원리 이해에 더 효과적일 수 있다는 것을 깨달았다.

- 수동 DLQ 로직을 성공시킴으로써, 에러 처리 파이프라인의 전체 흐름을 이해했다.

- 실무에서는 자동 방식을 보다 많이 사용한다고 하는데, 내일은 자동방식 구현에 성공해보자.