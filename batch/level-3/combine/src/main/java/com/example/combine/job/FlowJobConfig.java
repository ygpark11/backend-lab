package com.example.combine.job;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.core.step.tasklet.Tasklet;
import org.springframework.batch.item.ItemReader;
import org.springframework.batch.item.ItemWriter;
import org.springframework.batch.item.support.ListItemReader;
import org.springframework.batch.repeat.RepeatStatus;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;

import java.util.Arrays;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class FlowJobConfig {

    // --- Job 정의 ---
    @Bean
    public Job flowJob(JobRepository jobRepository, Step processDataStep, Step moveFileStep) {
        return new JobBuilder("flowJob", jobRepository)
                .start(processDataStep) // 1. 먼저 '데이터 처리' Step을 실행하고,
                .next(moveFileStep)     // 2. 성공하면 '파일 이동' Step을 실행한다.
                .build();
    }

    // --- Step 1: Chunk 기반 Step ---
    @Bean
    public Step processDataStep(JobRepository jobRepository, ItemReader<String> itemReader,
                                ItemWriter<String> itemWriter, PlatformTransactionManager transactionManager) {
        return new StepBuilder("processDataStep", jobRepository)
                .<String, String>chunk(5, transactionManager)
                .reader(itemReader)
                .writer(itemWriter)
                .build();
    }

    // --- Step 2: Tasklet 기반 Step ---
    @Bean
    public Step moveFileStep(JobRepository jobRepository, Tasklet moveFileTasklet, PlatformTransactionManager transactionManager) {
        return new StepBuilder("moveFileStep", jobRepository)
                .tasklet(moveFileTasklet, transactionManager)
                .build();
    }

    // --- 컴포넌트 Bean 정의 ---
    @Bean
    public ItemReader<String> itemReader() {
        return new ListItemReader<>(Arrays.asList("A", "B", "C", "D", "E", "F", "G"));
    }

    @Bean
    public ItemWriter<String> itemWriter() {
        return items -> log.info(">>>> Chunk processed: {}", items);
    }

    @Bean
    public Tasklet moveFileTasklet() {
        return (contribution, chunkContext) -> {
            log.info(">>>> 데이터 처리 완료! 원본 파일을 백업 폴더로 이동합니다.");
            return RepeatStatus.FINISHED;
        };
    }
}
