# 카프카(Kafka) 학습 - Level 5: 메시지 중복과 멱등성

## 1. 핵심 개념 정리
- **메시지 중복**: 카프카는 '최소 한 번 처리(At-least-once)'를 보장하기 때문에, 컨슈머가 메시지를 처리하고 '완료 보고(Offset Commit)'를 하는 과정에서 네트워크 오류 등이 발생하면 동일한 메시지가 중복 처리될 수 있다.
- **멱등성 (Idempotence)**: 동일한 연산을 여러 번 수행하더라도 결과가 항상 같은 성질. 엘리베이터의 '닫힘' 버튼처럼, 중복 메시지를 받더라도 실제 비즈니스 로직은 단 한 번만 실행되도록 보장하는 것이 핵심이다.
- **멱등성 구현**: 프로듀서가 메시지에 **고유 ID(Unique ID)**를 부여하고, 컨슈머는 이 ID를 **영속적인 저장소(DB, Redis 등)에 기록**하여 이미 처리한 작업인지 확인하는 것이 가장 표준적인 방법이다.
- **메시지 키와 멱등성**: 여러 컨슈머가 동작하는 환경에서 멱등성을 완벽하게 보장하려면, **'고유 ID'를 카프카 메시지의 '키(Key)'로 사용**하는 것이 필수적이다. 이를 통해 같은 고유 ID를 가진 중복 메시지들이 항상 같은 파티션, 즉 같은 컨슈머에게 전달되도록 보장할 수 있다.

---
## 2. 핵심 코드 (컨슈머의 멱등성 처리)
```java
@Service
public class KafkaConsumerService {

    // 실무에서는 DB나 Redis와 같은 외부 저장소를 사용해야 한다.
    private final Set<String> processedMessageIds = Collections.synchronizedSet(new HashSet<>());

    @KafkaListener(topics = "my-first-topic", groupId = "my-group")
    public void consume(MyMessage message) {
        // 1. 장부를 확인하여 이미 처리된 메시지인지 검사한다.
        if (processedMessageIds.contains(message.getUniqueId())) {
            log.warn("Duplicate message detected! Skipping...");
            return;
        }

        // 2. 중복이 아니라면, 메시지를 처리한다.
        log.info("Successfully processed message: {}", message.toString());

        // 3. 처리가 완료되었으므로, 이 메시지의 ID를 장부에 기록한다.
        processedMessageIds.add(message.getUniqueId());
    }
}
```
---
## 3. 실습 Q&A 및 발견
### Q: 컨슈머가 여러 대면, 각자 다른 장부를 가지고 있어 중복 처리가 되지 않는가?
- A: `uniqueId`를 카프카 메시지의 **'키'**로 사용하면 해결된다. '같은 키는 항상 같은 파티션으로 간다'는 원칙 덕분에, 특정 `uniqueId`를 가진 메시지들은 항상 동일한 컨슈머에게만 전달되므로, 해당 컨슈머의 장부만 확인하면 된다.

### Q: 인메모리 장부는 재시작하면 사라지는데, 실무에서는 어떻게 하는가?
- A: 모든 컨슈머가 공유할 수 있는 외부의 영속적인 저장소를 장부로 사용한다.

  - 데이터베이스: `uniqueId`를 Primary Key로 갖는 테이블에 처리 기록을 INSERT한다. 중복 시 DB 오류가 발생하므로 이를 통해 중복을 감지한다.

  - Redis: 고성능이 필요할 때 사용한다. 서버 다운에 대비해 AOF, RDB와 같은 영속성 옵션을 반드시 함께 사용해야 한다.
---
## 4. 학습한 내용
- 메시지 중복이 '완료 보고(Offset Commit)'의 불확실성 때문에 발생하는 원리를 이해했다.

- '멱등성'의 개념을 이해하고, '고유 ID'를 이용해 중복 메시지를 안전하게 처리하는 컨슈머 로직을 직접 구현했다.

- 여러 컨슈머가 동작하는 분산 환경에서 멱등성을 보장하기 위해 '메시지 키'가 왜 필수적인지 명확하게 이해했다.

- 실무에서 멱등성 보장을 위해 상태(처리 기록)를 관리하는 방법(DB, Redis)과 Redis의 영속성 옵션에 대해 학습했다.