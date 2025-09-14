package com.example.hybrid.job;

import com.example.hybrid.entity.User;
import jakarta.persistence.EntityManagerFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.configuration.annotation.StepScope;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.partition.support.Partitioner;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.item.ItemWriter;
import org.springframework.batch.item.database.JpaPagingItemReader;
import org.springframework.batch.item.database.builder.JpaPagingItemReaderBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskExecutor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.transaction.PlatformTransactionManager;

import javax.sql.DataSource;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class PartitioningJobConfig {
    private final EntityManagerFactory entityManagerFactory;
    private final DataSource dataSource;
    private static final int CHUNK_SIZE = 10;

    // --- 1. Job 정의 ---
    @Bean
    public Job partitioningJob(JobRepository jobRepository, Step masterStep) {
        return new JobBuilder("partitioningJob", jobRepository)
                .start(masterStep) // 마스터 Step으로 시작
                .build();
    }

    // --- 2. Partitioner 빈 등록 ---
    @Bean
    public Partitioner idRangePartitioner() {
        return new IdRangePartitioner(dataSource);
    }

    // --- 3. Master Step 정의 ---
    @Bean
    public Step masterStep(JobRepository jobRepository, Step workerStep, Partitioner idRangePartitioner) {
        return new StepBuilder("masterStep", jobRepository)
                .partitioner("workerStep", idRangePartitioner) // (1) 워커 Step을 지정하고, Partitioner를 연결
                .step(workerStep) // (2) 각 파티션에서 실행될 Step(템플릿)을 지정
                .gridSize(3) // (3) 파티션 개수(공장 수)를 지정
                .taskExecutor(masterTaskExecutor()) // (4) 각 파티션을 별도의 스레드에서 실행
                .build();
    }

    // --- 4. Worker Step 정의 ---
    @Bean
    public Step workerStep(JobRepository jobRepository, PlatformTransactionManager transactionManager) {
        return new StepBuilder("workerStep", jobRepository)
                .<User, User>chunk(CHUNK_SIZE, transactionManager)
                .reader(jpaPagingItemReader(null, null)) // Reader는 아래에서 @StepScope로 생성
                .writer(itemWriter())
                .taskExecutor(workerTaskExecutor()) // (★) Worker Step도 별도의 TaskExecutor 사용
                .build();
    }

    // --- 5. Worker가 사용할 ItemReader 정의 (@StepScope) ---
    @Bean
    @StepScope // (★) Step 실행 시점에 생성되어, 각 파티션의 ExecutionContext에 접근 가능
    public JpaPagingItemReader<User> jpaPagingItemReader(
            @Value("#{stepExecutionContext['minId']}") Long minId, // (★) Partitioner가 넣어준 값을 주입받음
            @Value("#{stepExecutionContext['maxId']}") Long maxId
    ) {
        log.info("Reading users from id {} to {}", minId, maxId);

        Map<String, Object> params = new HashMap<>();
        params.put("minId", minId);
        params.put("maxId", maxId);

        return new JpaPagingItemReaderBuilder<User>()
                .name("jpaPagingItemReader")
                .entityManagerFactory(entityManagerFactory)
                .pageSize(CHUNK_SIZE)
                .queryString("SELECT u FROM User u WHERE u.id BETWEEN :minId AND :maxId ORDER BY u.id ASC") // (★) 주입받은 값으로 조회 범위 지정
                .parameterValues(params)
                .build();
    }

    // --- 6. ItemWriter (변경 없음) ---
    @Bean
    public ItemWriter<User> itemWriter() {
        return chunk -> {
            for (User user : chunk) {
                log.info("Thread: [{}], User ID: {}", Thread.currentThread().getName(), user.getId());
            }
        };
    }

    // --- 7. TaskExecutor (변경 없음) ---
    @Bean
    public TaskExecutor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(10);
        executor.setThreadNamePrefix("partition-thread-");
        executor.setDaemon(true);
        executor.initialize();
        return executor;
    }

    // 기존 taskExecutor는 이름을 masterTaskExecutor로 변경
    @Bean
    public TaskExecutor masterTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(10);
        executor.setThreadNamePrefix("master-thread-");
        executor.setDaemon(true);
        executor.initialize();
        return executor;
    }

    // workerStep을 위한 TaskExecutor를 새로 추가
    @Bean
    public TaskExecutor workerTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(10);
        executor.setThreadNamePrefix("worker-thread-");
        executor.setDaemon(true);
        executor.initialize();
        return executor;
    }
}
