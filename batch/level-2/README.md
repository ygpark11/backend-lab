# 스프링 배치 학습 - Level 2: Chunk 지향 처리

## 1. 핵심 개념 정리
- **Chunk 지향 처리**: 대용량 데이터를 'Chunk(덩어리)'라는 작은 묶음 단위로 나누어 처리하는 스프링 배치의 핵심 모델. 메모리 사용량을 최적화하고, 트랜잭션과 재시작을 효율적으로 관리한다.
- **`ItemReader`**: 데이터를 한 건씩 읽어오는 '짐 싣는 인부'.
- **`ItemProcessor`**: 읽어온 데이터를 가공하는 '짐 포장 인부'. (선택 사항)
- **`ItemWriter`**: 가공된 데이터를 Chunk 단위로 모아 한 번에 쓰는 '짐 내리는 인부'.

## 2. 실습 기록 및 Q&A

### 2-1. `ChunkJobConfig.java` (주석 포함)
> 12개의 아이템을 Chunk 크기 10으로 설정하여, 데이터를 읽고(Reader), 대문자로 가공하여(Processor), Chunk 단위로 묶어 로그에 출력하는(Writer) 실습을 진행했다.

```java
@Slf4j
@Configuration
@RequiredArgsConstructor
public class ChunkJobConfig {

    @Bean
    public Job chunkJob(JobRepository jobRepository, Step chunkStep) {
        // "chunkJob"이라는 이름의 Job을 정의하고, chunkStep으로 시작하도록 설정한다.
        return new JobBuilder("chunkJob", jobRepository)
                .start(chunkStep)
                .build();
    }

    @Bean
    public Step chunkStep(JobRepository jobRepository, ItemReader<String> itemReader,
                          ItemProcessor<String, String> itemProcessor, ItemWriter<String> itemWriter,
                          PlatformTransactionManager transactionManager) {
        // "chunkStep"이라는 이름의 Step을 정의한다.
        return new StepBuilder("chunkStep", jobRepository)
                // <Input, Output> 타입을 String으로 지정하고, Chunk 크기를 10으로 설정한다.
                // 하나의 Chunk 처리는 하나의 트랜잭션으로 묶인다.
                .<String, String>chunk(10, transactionManager)
                .reader(itemReader)
                .processor(itemProcessor)
                .writer(itemWriter)
                .build();
    }

    // Reader: 미리 정의된 List로부터 데이터를 하나씩 읽어온다.
    @Bean
    public ItemReader<String> itemReader() {
        List<String> items = Arrays.asList("item1", "item2", "item3", "item4", "item5", "item6", "item7", "item8", "item9", "item10", "item11", "item12");
        return new ListItemReader<>(items);
    }

    // Processor: 읽어온 아이템을 대문자로 바꾸고 뒤에 " processed"를 붙인다.
    @Bean
    public ItemProcessor<String, String> itemProcessor() {
        return item -> item.toUpperCase() + " processed";
    }

    // Writer: 가공된 아이템들을 10개씩(Chunk 단위) 묶어서 로그에 출력한다.
    @Bean
    public ItemWriter<String> itemWriter() {
        return items -> log.info(">>>> Chunk processed: {}", items);
    }
}
```
### 2-2. Chunk 크기 최적화 (핵심 Q&A)

#### Q: 적정 Chunk 크기는 어떻게 정해야 하나요?

- **A: 정답은 없지만, '줄다리기'를 생각하면 쉽다.**
    - **Chunk가 너무 크면**: `메모리 부족(OutOfMemoryError)`의 위험이 커지고, 실패 시 롤백 범위가 넓어진다.
    - **Chunk가 너무 작으면**: `DB 커밋`이 너무 잦아져 성능이 저하될 수 있다.
- **결론**: **시간(개별 처리 시간), 메모리(전체 데이터 크기), DB 부하(커밋 횟수)** 세 가지를 모두 고려하여, 실제 데이터로 테스트하며 우리 시스템에 맞는 최적의 균형점을 찾아야 한다.

---
### 2-3. Tasklet vs Chunk 조합 (핵심 Q&A)

#### Q: Tasklet과 Chunk를 함께 쓸 수 있나요?

- **A: 네, 가능하며 그것이 바로 스프링 배치의 강력함이다.**
    - **`Job`**이라는 큰 작업 안에, 여러 개의 **`Step`**을 순서대로 연결할 수 있다.
    - 대용량 데이터 처리는 **Chunk Step**으로 구현하고,
    - 그 이후의 마무리 작업(예: 알림 메일 발송)은 **Tasklet Step**으로 구현하여 하나의 `Job`으로 엮는 것이 일반적인 실무 패턴이다.

---
## 3. 학습한 내용

- Chunk 지향 처리의 핵심 구성 요소인 **`ItemReader`**, **`ItemProcessor`**, **`ItemWriter`**의 역할을 '공장 자동화 라인' 비유를 통해 이해하고 직접 구현했다.
- Chunk 크기가 성능과 안정성에 미치는 영향을 파악하고, **시간, 메모리, DB 부하**라는 세 가지 기준을 바탕으로 상황에 맞는 크기를 선택해야 함을 학습했다.
- 각 Step의 성격에 따라 **Tasklet 방식과 Chunk 방식을 조합**하여 하나의 Job으로 만들 수 있다는 스프링 배치의 유연하고 강력한 설계 사상을 이해했다.