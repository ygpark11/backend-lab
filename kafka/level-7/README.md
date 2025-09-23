# 카프카(Kafka) 학습 - DLQ 에러 처리 시스템 구현

## 1. 핵심 개념 정리
- **독약 메시지 (Poison Pill)**: 컨슈머가 처리할 수 없는 형식의 메시지. 이 메시지 하나가 전체 메시지 파이프라인을 막는 것을 방지해야 한다.

- **Dead Letter Queue (DLQ)**: 처리 실패한 메시지를 격리시키는 별도의 '불량품 보관함' 토픽. 전체 시스템의 장애를 막는 필수적인 에러 처리 패턴이다.

- **DefaultErrorHandler**: 스프링 카프카에서 재시도(Retry)와 DLQ 전송을 선언적으로 설정하는 강력한 에러 핸들러.

- **ErrorHandlingDeserializer**: 역직렬화(Deserialization) 단계에서 발생하는 근본적인 오류를 잡아내어 DefaultErrorHandler로 전달해주는 1차 방어막.

- **컨테이너 팩토리 분리 (핵심)**: 메인 리스너와 DLQ 리스너는 서로 다른 타입의 메시지(객체 vs. 문자열)를 처리하므로, 각각에 맞는 설정을 가진 별도의 KafkaListenerContainerFactory를 만들어 지정해야 한다. 이것이 복잡한 자동 설정을 성공시키는 핵심 열쇠이다.

---
## 2. 최종 구현: 실무 수준의 DLQ 에러 처리 시스템

### 2-1. `KafkaConfig.java` (핵심 설정)
```java
@Configuration
public class KafkaConfig {
    // 1. 메인 ConsumerFactory (ErrorHandlingDeserializer 사용)
    @Bean
    public ConsumerFactory<String, Object> consumerFactory(KafkaProperties props) { ... }

    // 2. DLQ 전송용 ProducerFactory와 KafkaTemplate
    @Bean
    public ProducerFactory<String, Object> dltProducerFactory(KafkaProperties properties) { ... }
    @Bean
    public KafkaTemplate<String, Object> dltKafkaTemplate(...) { ... }

    // 3. 재시도 및 DLQ 전송을 담당하는 CommonErrorHandler
    @Bean
    public CommonErrorHandler errorHandler(...) { ... }

    // 4. 메인 리스너를 위한 ContainerFactory (errorHandler 장착)
    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, Object> mainListenerContainerFactory(...) { ... }

    // 5. DLQ 리스너를 위한 별도의 ContainerFactory (단순 문자열 처리)
    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, String> dltListenerContainerFactory(...) { ... }
}
```

### 2-2. `KafkaConsumerService.java` (역할 분리)
```java
@Service
public class KafkaConsumerService {
    // 메인 토픽 리스너 (mainListenerContainerFactory 사용)
    @KafkaListener(topics = "my-first-topic", containerFactory = "mainListenerContainerFactory")
    public void consume(MyMessage message, ...) {
        // 역직렬화 실패 시 message가 null로 들어옴
        if (message == null) {
            throw new RuntimeException("Deserialization failed.");
        }
        // 비즈니스 로직 실패 시 예외 발생
        if ("poison-pill".equals(message.getMessageId())) {
            throw new RuntimeException("Logical poison pill.");
        }
        log.info("Processed message: {}", message);
    }

    // DLQ 토픽 리스너 (dltListenerContainerFactory 사용)
    @KafkaListener(topics = "my-first-topic.DLT", containerFactory = "dltListenerContainerFactory")
    public void consumeDlt(String raw) {
        log.error("[DLT] raw payload={}", raw);
    }
}
```
---
## 3. 실습 및 학습한 내용

### 목표: `DefaultErrorHandler`를 이용한 자동 DLQ 구현
- 스프링 카프카의 표준 방식인 '자동' 에러 핸들러를 사용하여, 역직렬화 실패(Poison Pill) 메시지를 재시도 후 DLQ 토픽으로 격리시키는 것을 목표로 했다.

### 마주친 문제: 설정의 딜레마
`DefaultErrorHandler`를 적용하는 과정에서, 우리는 근본적인 딜레마에 부딪혔다.
- 정상 메시지를 처리하도록 설정하면 (`JsonDeserializer`): '독약' 메시지(단순 문자열)를 처리하지 못하고 DLQ 발행에 실패했다.
- '독약' 메시지를 처리하도록 설정을 바꾸면: 이번에는 정상 메시지(JSON 객체)를 오류로 인식하여 불필요한 재시도를 하거나 처리에 실패했다.
- 즉, 하나의 리스너 설정으로는 두 가지 다른 종류의 메시지(정상 객체, 실패 문자열)를 동시에 우아하게 처리할 수 없는 문제가 있었다.

### 최종 해결: Container Factory 분리
문제의 근본 원인이 하나의 KafkaListenerContainerFactory 설정을 메인 리스너와 DLQ 리스너가 공유하면서 발생한 충돌임을 발견했다.

메인 리스너를 위한 mainListenerContainerFactory와, 단순 문자열을 처리하는 DLQ 리스너를 위한 별도의 dltListenerContainerFactory를 만들어 각 리스너에 명시적으로 지정함으로써 문제를 해결하고 자동 DLQ 구성을 실습했다.