# 카프카(Kafka) 학습 - Level 1: 거대한 고속도로 시스템의 등장

## 1. 핵심 개념 정리
- **카프카의 목적**: 여러 시스템 간의 데이터 통신을 중앙 집중화된 메시지 큐를 통해 관리하여, 복잡한 '스파게티' 구조를 해결하고 시스템 간 결합도를 낮추기 위해 탄생했다.
- **핵심 구성 요소 (고속도로 비유)**:
    - **프로듀서 (Producer)**: 데이터를 생산하여 고속도로에 진입시키는 '자동차'.
    - **컨슈머 (Consumer)**: 고속도로 출구에서 데이터를 받아 처리하는 '목적지'.
    - **브로커 (Broker)**: 데이터가 달리는 '고속도로' 자체 (카프카 서버).
    - **토픽 (Topic)**: "주문 정보", "배송 정보" 등 데이터의 종류를 구분하는 '차선'.
- **데이터 지속성 (Durability)**: 카프카는 전달받은 메시지를 컨슈머가 읽었는지와 상관없이, 설정된 보관 주기 동안 디스크에 안전하게 저장한다. 덕분에 컨슈머가 나중에 실행되더라도 이전 메시지를 모두 처리할 수 있다.
- **단일 프로젝트에서의 활용**: 여러 서비스 간 통신뿐만 아니라, 단일 웹 프로젝트 내에서도 이메일 발송과 같은 느린 작업을 분리하여 사용자에게 빠른 응답을 제공하는 '비동기 처리' 목적으로 매우 유용하게 사용된다.

---
## 2. 핵심 코드
### 2-1. `docker-compose.yml` (Confluent 이미지)
```yaml
version: '3.8'
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.6.1
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.6.1
    ports:
      - "9092:9092"
    environment:
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: 'zookeeper:2181'
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0
    depends_on:
      - zookeeper
```

### 2-2. 프로듀서 (메시지 발송)
```java
@Service
@RequiredArgsConstructor
public class KafkaProducerService {
    private final KafkaTemplate<String, String> kafkaTemplate;

    public void sendMessage(String topic, String message) {
        kafkaTemplate.send(topic, message);
    }
}
```

### 2-3. 컨슈머 (메시지 수신)
```java
@Service
public class KafkaConsumerService {
    @KafkaListener(topics = "my-first-topic", groupId = "my-group")
    public void consume(String message) {
        log.info("Received message: {}", message);
    }
}
```

## 3. 실습 Q&A 및 발견
### Q: 프로듀서는 실행 후 바로 종료되는데, 컨슈머는 왜 계속 실행되나요?
- A: `@KafkaListener`는 백그라운드 스레드에서 무한 루프를 돌며 새로운 메시지를 계속 감시하기 때문이다. 이것이 바로 카프카를 이용한 실시간 이벤트 처리의 핵심 원리다.

### Q: 컨슈머가 없는 토픽에 메시지를 보내면 어떻게 되나요?
- A: 메시지는 사라지지 않는다. 카프카 브로커는 해당 토픽을 자동으로 생성하고, 메시지를 디스크에 안전하게 저장한다. 나중에 해당 토픽을 구독하는 컨슈머가 생기면, 그동안 쌓여있던 메시지를 모두 가져가서 처리할 수 있다.

### Q: 단일 웹 프로젝트에서 카프카는 어떻게 사용되나요?
- A: 사용자에게 빠른 응답을 주기 위해 느린 작업을 분리하는 '비동기 처리'에 사용된다. 예를 들어, 회원가입 요청 시 DB 저장 후 즉시 "성공" 응답을 보내고, 환영 이메일 발송 같은 작업은 카프카에 메시지로 던져두면, 백그라운드의 컨슈머가 알아서 처리한다.

## 4. 학습한 내용
- 도커 컴포즈를 사용하여 주키퍼와 카프카 서버를 구축하는 방법을 학습했다. (최신 이미지 버전의 변경사항과 트러블슈팅 경험)

- 스프링 부트 애플리케이션에서 KafkaTemplate을 사용하여 프로듀서를, @KafkaListener를 사용하여 컨슈머를 간단하게 구현했다.

- 프로듀서와 컨슈머가 서로를 모르는 상태에서도 카프카를 통해 완벽하게 분리되어 비동기적으로 통신하는 것을 눈으로 확인했다.

- 카프카의 핵심 특징인 데이터 지속성과 단일 프로젝트에서의 비동기 처리 활용법을 이해했다.