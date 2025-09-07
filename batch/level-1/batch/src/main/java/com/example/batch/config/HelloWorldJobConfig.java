package com.example.batch.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.core.step.tasklet.Tasklet;
import org.springframework.batch.repeat.RepeatStatus;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class HelloWorldJobConfig {

    // (1) Job을 생성하는 Bean
    @Bean
    public Job helloWorldBatch(JobRepository jobRepository, Step helloWorldStep) {
        return new JobBuilder("helloWorldJob", jobRepository)
                .start(helloWorldStep) // 이 Job은 helloWorldStep 하나로 이루어져 있다.
                .build();
    }

    // (2) Step을 생성하는 Bean
    @Bean
    public Step helloWorldStep(JobRepository jobRepository, Tasklet helloWorldTasklet, PlatformTransactionManager transactionManager) {
        return new StepBuilder("helloWorldStep", jobRepository)
                .tasklet(helloWorldTasklet, transactionManager) // 이 Step은 helloWorldTasklet 하나를 실행한다.
                .build();
    }

    // (3) Step 안에서 실행될 실제 작업(Tasklet)을 생성하는 Bean
    @Bean
    public Tasklet helloWorldTasklet() {
        return (contribution, chunkContext) -> {
            log.info(">>>> Hello, World! Spring Batch!");
            return RepeatStatus.FINISHED; // 작업을 한 번만 실행하고 끝낸다.
        };
    }
}
