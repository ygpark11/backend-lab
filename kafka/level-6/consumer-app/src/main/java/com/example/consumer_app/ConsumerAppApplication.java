package com.example.consumer_app;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class ConsumerAppApplication {

	public static void main(String[] args) {
		SpringApplication.run(ConsumerAppApplication.class, args);
	}

    // (★) ObjectMapper를 스프링 빈으로 직접 등록합니다.
    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper();
    }
}
