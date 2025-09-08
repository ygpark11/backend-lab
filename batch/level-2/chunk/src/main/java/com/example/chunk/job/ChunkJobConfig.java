package com.example.chunk.job;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.item.ItemProcessor;
import org.springframework.batch.item.ItemReader;
import org.springframework.batch.item.ItemWriter;
import org.springframework.batch.item.support.ListItemReader;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;

import java.util.Arrays;
import java.util.List;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class ChunkJobConfig {

    @Bean
    public Job chunkJob(JobRepository jobRepository, Step chunkStep) {
        return new JobBuilder("chunkJob", jobRepository)
                .start(chunkStep)
                .build();
    }

    @Bean
    public Step chunkStep(JobRepository jobRepository, ItemReader<String> itemReader,
                          ItemProcessor<String, String> itemProcessor, ItemWriter<String> itemWriter,
                          PlatformTransactionManager transactionManager) {
        return new StepBuilder("chunkStep", jobRepository)
                // <Input, Output> 제네릭. Chunk 크기를 10으로 설정
                .<String, String>chunk(10, transactionManager)
                .reader(itemReader)
                .processor(itemProcessor)
                .writer(itemWriter)
                .build();
    }

    // Reader: "item1"부터 "item12"까지의 데이터를 하나씩 읽어온다.
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
        return items -> log.info(">>>> Chunk processed {}", items);
    }
}
