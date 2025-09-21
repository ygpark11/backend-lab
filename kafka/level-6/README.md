# 카프카(Kafka) 학습 - Level 6: 에러 처리와 Dead Letter Queue (DLQ) 디버깅

## 1. 핵심 개념 정리
- **독약 메시지 (Poison Pill)**: 컨슈머가 처리할 수 없는 형식의 메시지. 이 메시지 하나 때문에 전체 파이프라인이 멈추는 것을 막아야 한다.
- **Dead Letter Queue (DLQ)**: 처리 실패한 메시지를 격리시키는 별도의 '불량품 보관함' 토픽. 이를 통해 정상적인 메시지들은 계속 처리될 수 있다.
- **`DefaultErrorHandler`**: 스프링 카프카에서 재시도(Retry)와 DLQ 전송을 쉽게 설정할 수 있도록 도와주는 강력한 에러 핸들러.
- **`ErrorHandlingDeserializer`**: 역직렬화(Deserialization) 단계에서 발생하는 근본적인 오류를 잡아내어 `DefaultErrorHandler`로 전달해주는 1차 방어막.

---
## 2. 핵심 설정 (`KafkaConfig.java`)
```java
@Configuration
public class KafkaConfig {

    // DLQ 전용 KafkaTemplate을 주입받아 에러 핸들러를 설정
    @Bean
    public CommonErrorHandler errorHandler(KafkaTemplate<String, byte[]> dltKafkaTemplate) {
        // 재시도 실패 시 dltKafkaTemplate을 사용해 DLQ로 메시지를 보냄
        DeadLetterPublishingRecoverer recoverer = new DeadLetterPublishingRecoverer(dltKafkaTemplate);
        // 1초 간격으로 2번 재시도
        return new DefaultErrorHandler(recoverer, new FixedBackOff(1000L, 2));
    }

    // DLQ로 보낼 메시지의 Value를 byte[]로 직렬화하는 ProducerFactory 생성
    @Bean
    public ProducerFactory<String, byte[]> dltProducerFactory(KafkaProperties properties) {
        // ...
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, ByteArraySerializer.class);
        return new DefaultKafkaProducerFactory<>(props);
    }
    
    // DLQ 전용 KafkaTemplate 생성
    @Bean
    public KafkaTemplate<String, byte[]> dltKafkaTemplate(ProducerFactory<String, byte[]> dltProducerFactory) {
        return new KafkaTemplate<>(dltProducerFactory);
    }

    // 위에서 만든 errorHandler를 모든 @KafkaListener에 적용하는 팩토리
    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, Object> kafkaListenerContainerFactory(...) {
        // ...
        factory.setCommonErrorHandler(commonErrorHandler);
        return factory;
    }
}
```
---
## 3. 실습 Q&A 및 발견 (끈질긴 디버깅 여정)
### 목표: 역직렬화 실패 메시지를 DLQ로 보내기
프로듀서가 정상 JSON 메시지 1개와 비정상 문자열(독약) 1개를 보내고, 컨슈머가 비정상 메시지를 재시도 후 DLQ 토픽으로 격리시키는 것을 목표로 했다.

### 마주친 문제들과 해결 과정
1. 역직렬화 오류: JsonDeserializer가 문자열을 객체로 변환하지 못하고 에러 발생. -> ErrorHandlingDeserializer를 도입하여 해결.

2. NullPointerException: RetryListener에서 record.value()가 null이 되어 발생. -> null 체크 로직 추가하여 해결.

3. DLQ 전송 실패: DLQ로 보내는 프로듀서가 byte[]를 String으로 보내려다 SerializationException 발생. -> ByteArraySerializer를 사용하는 DLQ 전용 KafkaTemplate을 만들어 해결.

4. Bean 생성 오류: 커스텀 KafkaTemplate을 만들자 스프링이 기본 Bean을 생성하지 않아 발생. -> errorHandler가 올바른 KafkaTemplate을 주입받도록 수정하여 해결.

5. 마지막 관문: 모든 설정을 마쳤음에도, 재시도 로그까지만 확인되고 최종 DLQ 메시지 수신 로그가 찍히지 않는 문제가 발생. 이는 라이브러리 버전과 환경의 미묘한 차이로 인한 복잡한 문제로 추정된다.
---

## 4. 학습한 내용
- 스프링 카프카의 DefaultErrorHandler를 사용하여 재시도 및 DLQ 로직을 선언적으로 설정하는 방법을 학습했다.

- 역직렬화 단계의 오류를 처리하기 위한 ErrorHandlingDeserializer의 중요성을 이해했다.

- DLQ로 메시지를 보낼 때 발생할 수 있는 직렬화 문제를 해결하기 위해, 별도의 ProducerFactory와 KafkaTemplate을 구성하는 방법을 익혔다.