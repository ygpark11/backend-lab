# 스프링 배치 학습 - Level 4: 병렬 처리와 스레드 풀링

## 1. 핵심 개념 정리
- **`Multi-threaded Step`**: 하나의 Step을 여러 스레드로 동시에 실행하여 처리 속도를 극대화하는 병렬 처리 기술. Step 설정에 `TaskExecutor`를 추가하여 활성화한다.
- **스레드 안전성 (Thread-Safety)**: 여러 스레드가 공유 자원에 동시에 접근할 때 데이터가 훼손되지 않도록 보장하는 것. 멀티 스레드 프로그래밍에서 가장 중요한 개념이다.
- **경쟁 상태 (Race Condition)**: 여러 스레드가 공유 변수(State)를 동시에 수정하려고 경쟁하여 예상치 못한 결과가 발생하는 문제. `AtomicInteger`와 같은 원자적 연산을 지원하는 클래스를 통해 해결할 수 있다.
- **`TaskExecutor` vs. `ExecutorService`**: `ExecutorService`는 결과를 반환받는(`Future`) 정교한 비동기 처리에 적합한 자바 표준 인터페이스(설계도)이며, `TaskExecutor`는 스프링 환경에서 간단한 병렬 실행에 편리하도록 추상화된 인터페이스다. `ThreadPoolTaskExecutor`는 `ExecutorService`를 구현한 스프링의 실제 제품(구현체)이다.
- **`CPU-bound` vs. `I/O-bound`**: 작업의 성격에 따라 최적의 스레드 수가 달라진다. DB 조회와 같은 `I/O-bound` 작업은 CPU 코어 수보다 많은 스레드를 설정하는 것이 효율적이나, 무작정 늘리면 컨텍스트 스위칭 비용으로 인해 오히려 성능이 저하될 수 있다.

---
## 2. 핵심 코드
### 2-1. `TaskExecutor` 설정 (우아한 종료 방식)
```java
@Bean
public TaskExecutor taskExecutor() {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(5);
    executor.setMaxPoolSize(10);
    executor.setThreadNamePrefix("batch-thread-");
    executor.setDaemon(true); // 스레드를 데몬 스레드로 설정하여 Job 종료 시 JVM이 함께 종료되도록 함
    executor.initialize();
    executor.setWaitForTasksToCompleteOnShutdown(true); // 선택사항 - 종료 시 모든 작업이 완료될 때까지 기다림
    executor.setAwaitTerminationSeconds(10); // 선택사항 - 최대 10초까지 기다림
    return executor;
}
```
### 2-2. 스레드 안전한 `ItemProcessor`
```java
@Component
public class SafeItemProcessor implements ItemProcessor<User, User> {

    // int 대신 AtomicInteger를 사용하여 스레드 안전성을 확보
    private final AtomicInteger count = new AtomicInteger(0);

    @Override
    public User process(User user) throws Exception {
        // 원자적 연산을 보장하는 incrementAndGet() 메서드를 사용
        int currentCount = count.incrementAndGet();
        log.info("Thread: [{}], User ID: [{}], Count: [{}]",
                Thread.currentThread().getName(), user.getId(), currentCount);
        return user;
    }
}
```
### 2-3. Step에 `TaskExecutor` 적용
```java
@Bean
public Step jpaPagingStep(JobRepository jobRepository,
                          PlatformTransactionManager transactionManager,
                          SafeItemProcessor safeItemProcessor) {
    return new StepBuilder("jpaPagingStep", jobRepository)
            .<User, User>chunk(CHUNK_SIZE, transactionManager)
            .reader(jpaPagingItemReader())
            .processor(safeItemProcessor)
            .writer(jpaPagingItemWriter())
            .taskExecutor(taskExecutor()) // ★ Step이 멀티 스레드로 동작하도록 설정
            .build();
}
```
## 3. 실습 Q&A 및 발견
### Q: `TaskExecutor`를 사용하니 왜 애플리케이션이 종료되지 않는가?
A: `ThreadPoolTaskExecutor`는 기본적으로 사용자 스레드(User Thread)를 생성한다. 배치 Job이 끝나도 이 스레드들은 계속 대기 상태로 남아있기 때문에 JVM이 종료되지 않는다. `executor.setDaemon(true)` 설정을 통해 스레드를 데몬 스레드로 만들어 이 문제를 해결했다.

### Q: `parallelStream`을 웹 애플리케이션의 I/O 작업에 사용하면 안 되는 이유는?
A: `parallelStream`은 JVM 공용 스레드 풀을 사용한다. I/O 작업으로 인해 이 공용 풀의 스레드들이 모두 대기 상태에 빠지면, 웹 요청을 처리할 스레드가 부족해져 전체 애플리케이션이 멈추는 '스레드 고갈' 현상이 발생할 수 있다. 따라서 오래 걸리는 병렬 작업은 반드시 별도의 격리된 스레드 풀에서 처리해야 한다.

## 4. 학습한 내용
- TaskExecutor를 Step에 적용하여 병렬 처리를 구현하고, 데몬 스레드 설정을 통해 배치 Job을 우아하게 종료시키는 방법을 학습했다.

- 경쟁 상태의 위험성을 코드로 직접 확인하고, AtomicInteger를 사용하여 스레드 안전한 컴포넌트를 작성하는 방법을 익혔다.

- TaskExecutor와 ExecutorService의 관계를 '인터페이스와 구현체'로 명확히 이해하고, 각 기술의 적절한 사용처를 파악했다.

- 작업의 종류(CPU-bound vs. I/O-bound)에 따라 최적의 스레드 수가 달라지며, 격리된 스레드 풀의 중요성을 parallelStream의 함정과 비교하며 깊이 이해했다.