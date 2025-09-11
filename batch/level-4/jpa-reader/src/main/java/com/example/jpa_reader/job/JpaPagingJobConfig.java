package com.example.jpa_reader.job;

import com.example.jpa_reader.entity.User;
import jakarta.persistence.EntityManagerFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.item.ItemReader;
import org.springframework.batch.item.ItemWriter;
import org.springframework.batch.item.database.builder.JpaPagingItemReaderBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskExecutor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.transaction.PlatformTransactionManager;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class JpaPagingJobConfig {

    private final EntityManagerFactory entityManagerFactory;

    private static final int CHUNK_SIZE = 10; // 테스트를 위해 청크 사이즈를 10으로 설정

    @Bean
    public TaskExecutor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5); // (1) 평상시에 대기하고 있을 작업자(스레드)의 수 - (동시에 실행할 기본 스레드 수)
        executor.setMaxPoolSize(10); // (2) 스레드 풀의 최대 스레드 수 (작업이 몰릴 때 최대로 늘어날 수 있는 작업자의 수)
        executor.setThreadNamePrefix("batch-thread-"); // 스레드 이름 접두사
        executor.setDaemon(true);
        executor.setWaitForTasksToCompleteOnShutdown(true); // (1) 종료 시 모든 작업이 완료될 때까지 기다림
        executor.setAwaitTerminationSeconds(10); // (2) 최대 10초까지 기다림
        executor.initialize();
        return executor;
    }

    // --- Job 정의 ---
    @Bean
    public Job jpaPagingJob(JobRepository jobRepository, Step jpaPagingStep) {
        return new JobBuilder("jpaPagingJob", jobRepository)
                .start(jpaPagingStep)
                .build();
    }

    // --- Step 정의 ---
    @Bean
    public Step jpaPagingStep(JobRepository jobRepository,
                              ItemReader<User> jpaPagingReader,
                              //UnsafeItemProcessor unsafeItemProcessor, // (4) Processor를 파라미터로 주입받습니다.
                              SafeItemProcessor safeItemProcessor, // (6) Processor를 파라미터로 주입받습니다.
                              ItemWriter<User> jpaPagingItemWriter,
                              PlatformTransactionManager transactionManager) {
        return new StepBuilder("jpaPagingStep", jobRepository)
                .<User, User>chunk(CHUNK_SIZE, transactionManager)
                .reader(jpaPagingReader) // 아래에서 만든 Reader Bean을 사용
                //.processor(unsafeItemProcessor) // (5) Reader와 Writer 사이에 Processor를 추가!
                .processor(safeItemProcessor) // (7) Reader와 Writer 사이에 Processor를 추가!
                .writer(jpaPagingItemWriter) // 아래에서 만든 Writer Bean을 사용
                .taskExecutor(taskExecutor()) // (3) 이 Step을 멀티스레드로 실행하도록 설정!
                .build();
    }

    // --- ItemReader 정의 ---
    @Bean
    public ItemReader<User> jpaPagingReader() {
        return new JpaPagingItemReaderBuilder<User>()
                .name("jpaPagingItemReader")
                .entityManagerFactory(entityManagerFactory)
                .pageSize(CHUNK_SIZE) // 페이지 사이즈도 청크 사이즈와 동일하게 설정
                .queryString("SELECT u FROM User u ORDER BY u.id ASC") // 정렬(ORDER BY) 필수!
                .build();
    }

    // --- ItemWriter 정의 ---
    @Bean
    public ItemWriter<User> jpaPagingItemWriter() {
        return chunk -> {
            for (User user : chunk) {
                log.info(">>>> User ID: {}", user.getId());
            }
        };
    }
}
