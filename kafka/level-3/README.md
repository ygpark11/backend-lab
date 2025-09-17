# 카프카(Kafka) 학습 - Level 3: 메시지 키와 순서 보장 (미스터리 추적기)

## 1. 핵심 개념 정리
- **메시지 키 (Message Key)**: 메시지에 붙이는 '꼬리표'. 카프카는 이 키를 기준으로 메시지를 어떤 파티션으로 보낼지 결정한다.
- **순서 보장**: 카프카는 **'같은 키를 가진 메시지는 항상 같은 파티션으로 보내는 것'**을 보장한다. 하나의 파티션은 하나의 컨슈머만 담당하므로, 결과적으로 특정 키에 대한 메시지들은 항상 순서대로 처리된다.
- **기본 파티셔너 (Default Partitioner)**: `Key`가 있을 경우, 키의 해시(hash)값을 계산하여 파티션 번호를 결정한다. 하지만 최신 버전의 `StickyPartitioner`는 네트워크 효율을 위해, 키가 다르더라도 짧은 시간 내의 메시지들은 하나의 파티션으로 묶어 보내려는 경향이 매우 강하다.

---
## 2. 핵심 코드
### 2-1. `producer-app/application.yml`
```yaml
spring:
  kafka:
    producer:
      bootstrap-servers: localhost:9092
```

### 2-2. `ProducerAppApplication.java` (성공적인 메시지 분배)