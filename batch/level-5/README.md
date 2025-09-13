# 스프링 배치 학습 - Level 5: 파티셔닝 (Partitioning)

## 1. 핵심 개념 정리
- **파티셔닝 (Partitioning)**: 대용량 데이터를 여러 개의 작은 조각(파티션)으로 분할하고, 각 파티션을 독립적인 `Step`에서 동시에 처리하는 대규모 병렬 처리 기술.
- **`Master/Worker` 구조**:
    - **`Master Step`**: `Partitioner`를 사용하여 전체 작업을 분할하고, 각 `Worker Step`에 작업 범위를 할당하는 지휘자 역할.
    - **`Worker Step`**: Master에게 할당받은 특정 범위의 데이터만 처리하는 실제 일꾼.
- **`@StepScope`**: Job의 파라미터나 다른 Step의 `ExecutionContext`에 있는 값을 Step 실행 시점에 지연 주입(Lazy Injection)받을 수 있게 해주는 기능. 파티셔닝에서 각 워커가 자신만의 데이터 범위를 주입받기 위해 필수적이다.

---
## 2. 핵심 코드
### 2-1. `IdRangePartitioner` (데이터 분할 설계도)
```java
// users 테이블의 min(id), max(id)를 기준으로 gridSize만큼 범위를 분할하고,
// 각 파티션의 ExecutionContext에 minId, maxId를 저장하여 반환.
@RequiredArgsConstructor
public class IdRangePartitioner implements Partitioner {
    private final DataSource dataSource;
    // ... partition(int gridSize) 구현 ...
}
```

### 2-2. `@StepScope`를 이용한 `ItemReader` (데이터 범위 주입)
```java
@Bean
@StepScope
public JpaPagingItemReader<User> jpaPagingItemReader(
        @Value("#{stepExecutionContext['minId']}") Long minId,
        @Value("#{stepExecutionContext['maxId']}") Long maxId
) {
    // ...
    return new JpaPagingItemReaderBuilder<User>()
            .queryString("SELECT u FROM User u WHERE u.id BETWEEN :minId AND :maxId")
            // ...
            .build();
}
```


### 2-3. `Master Step` (작업 지휘)
```java
@Bean
public Step masterStep(...) {
    return new StepBuilder("masterStep", jobRepository)
            .partitioner("workerStep", idRangePartitioner())
            .step(workerStep())
            .gridSize(3) // 파티션(워커) 개수 설정
            .taskExecutor(taskExecutor())
            .build();
}
```
---
## 3. 실습 Q&A 및 발견
### Q: Multi-threaded Step vs. Partitioning의 차이는?
- A: Multi-threaded Step은 단일 서버의 성능을 극한으로 끌어쓰는 수직 확장(Scale-up)에 가깝다. 반면, Partitioning은 여러 서버로 작업을 분산할 수 있는 수평 확장(Scale-out)을 위해 설계되었다. '하나의 주방에 요리사 늘리기'와 '여러 개의 프랜차이즈 식당 운영하기'의 차이다.

### Q: 단일 서버에서는 항상 Multi-threaded Step만 쓰면 되는가?
- A: 그렇지 않다. 파티셔닝은 뛰어난 **장애 복구성(Fault Tolerance)**이라는 숨겨진 강점이 있다. Multi-threaded Step은 Step 실패 시 전체를 재시작해야 할 수 있지만, Partitioning은 실패한 파티션(Worker Step)만 재시작하면 된다. 따라서 작업 시간이 매우 긴 대용량 배치에서는 단일 서버일지라도 파티셔닝이 더 안정적인 선택이다.

### Q: 언제 어떤 기술을 선택해야 하는가?
- A: '스케줄러 vs. 배치'의 관계와 유사하다. 간단하고 빠른 병렬 처리는 Multi-threaded Step (맥가이버칼), 매우 크고 중요하며 안정성이 최우선인 작업은 Partitioning (전문가용 공구함)을 선택하는 것이 합리적이다.
---

## 4. 학습한 내용
- `Partitioner`와 `Master/Worker` 구조를 통해 파티셔닝 Job을 구현하는 방법을 학습했다.

- `@StepScope`와 `stepExecutionContext`를 사용하여 각 파티션에 동적으로 파라미터를 전달하는 방법을 익혔다.

- `Multi-threaded Step`과 `Partitioning`의 근본적인 차이점(수직/수평 확장, 장애 복구성)을 이해하고, 상황에 맞는 기술을 선택하는 기준을 세웠다.

- 복잡한 기술을 배울 때, 그 기술이 해결하고자 하는 근본적인 문제가 무엇인지 파고드는 것이 중요함을 깨달았다.