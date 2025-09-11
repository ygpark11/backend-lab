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
import org.springframework.transaction.PlatformTransactionManager;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class JpaPagingJobConfig {

    private final EntityManagerFactory entityManagerFactory;

    private static final int CHUNK_SIZE = 10; // 테스트를 위해 청크 사이즈를 10으로 설정

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
                              ItemWriter<User> jpaPagingItemWriter,
                              PlatformTransactionManager transactionManager) {
        return new StepBuilder("jpaPagingStep", jobRepository)
                .<User, User>chunk(CHUNK_SIZE, transactionManager)
                .reader(jpaPagingReader) // 아래에서 만든 Reader Bean을 사용
                .writer(jpaPagingItemWriter) // 아래에서 만든 Writer Bean을 사용
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
