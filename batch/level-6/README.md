# 스프링 배치 학습 - Level 6: 하이브리드 모델 (궁극의 병렬 처리)

## 1. 핵심 개념 정리
- **하이브리드 모델**: 파티셔닝(`Partitioning`)과 멀티스레드 스텝(`Multi-threaded Step`)을 조합한 궁극의 병렬 처리 방식. 여러 공장(파티션)을 동시에 가동하면서, 각 공장 내부에도 여러 컨베이어 벨트(스레드)를 설치하는 것과 같다.
- **성능과 안정성**: 이 모델은 수직 확장(Scale-up)과 수평 확장(Scale-out)의 장점을 모두 취하여 최고의 성능을 목표로 한다.
- **스레드 풀 격리**: 마스터 스텝과 워커 스텝의 `TaskExecutor`를 분리하는 것은 시스템의 **안정성과 예측 가능성**을 높이는 실무적인 설계 패턴이다. 중요한 지휘 역할을 하는 마스터의 작업이 실제 데이터 처리를 하는 워커의 작업에 의해 방해받지 않도록 보장한다.

---
## 2. 핵심 코드
### 2-1. 워커 스텝의 멀티스레드화
```java
@Bean
public Step workerStep(JobRepository jobRepository,
                       PlatformTransactionManager transactionManager,
                       TaskExecutor workerTaskExecutor) { // 워커 전용 TaskExecutor 주입
    return new StepBuilder("workerStep", jobRepository)
            .<User, User>chunk(CHUNK_SIZE, transactionManager)
            .reader(jpaPagingItemReader(null, null))
            .writer(itemWriter())
            .taskExecutor(workerTaskExecutor) // 워커 Step 자체를 멀티 스레드로 실행
            .build();
}
```

### 2-2. 역할별 `TaskExecutor` 분리
```java
// 마스터 Step을 위한 스레드 풀
@Bean
public TaskExecutor masterTaskExecutor() {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setThreadNamePrefix("master-thread-");
    // ... (설정) ...
    return executor;
}

// 워커 Step들을 위한 스레드 풀
@Bean
public TaskExecutor workerTaskExecutor() {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setThreadNamePrefix("worker-thread-");
    // ... (설정) ...
    return executor;
}
```

## 3. 실습 Q&A 및 발견
### Q: 스레드 풀을 격리하는 것이 성능 향상에 도움이 되는가?
- A: 직접적인 성능 향상보다는 안정성과 예측 가능성을 위한 목적이 더 크다. 중요한 역할(마스터)과 무거운 작업(워커)의 리소스를 분리하여, 서로의 작업에 영향을 주지 않도록 하는 실무적인 설계 패턴이다.

### Q: 데이터가 적을 때 성능 향상이 체감되지 않는 이유는?
- A: 데이터 수가 적으면, 병렬 처리를 준비하는 오버헤드(회의 시간)가 실제 데이터를 처리하는 시간보다 더 커서 효과가 나타나지 않는다. 수십만 건 이상의 데이터 처리 시 비로소 그 진가를 발휘한다.

### Q: 어떤 병렬 처리 기술을 언제 선택해야 하는가? (최종 정리)
- A:

  - Multi-threaded Step: 단일 서버 환경에서, 수십만 건 내외의 데이터를 간단하고 빠르게 처리하고 싶을 때 사용한다.

  - Partitioning / Hybrid Model: 데이터가 수백만 건 이상으로 매우 많거나, 작업 시간이 길어 안정적인 장애 복구가 매우 중요할 때 사용한다. 단일 서버일지라도 장애 복구성이 중요하다면 파티셔닝을 고려한다.

## 4. 학습한 내용
- 파티셔닝과 멀티스레드 스텝을 조합하여 하이브리드 병렬 처리 모델을 구현하는 방법을 학습했다.

- 마스터와 워커의 스레드 풀을 격리하여 시스템의 안정성을 높이는 실무적인 설계 패턴을 이해했다.

- 병렬 처리의 성능 향상은 데이터 규모가 일정 수준 이상일 때 의미가 있으며, 오버헤드의 개념을 이해했다.

- 각 병렬 처리 기술의 장단점과 트레이드오프를 종합적으로 비교하여, 상황에 맞는 최적의 아키텍처를 선택하는 의사결정 모델을 정립했다.