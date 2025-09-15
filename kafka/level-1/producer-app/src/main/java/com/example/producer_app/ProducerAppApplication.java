package com.example.producer_app;

import com.example.producer_app.service.KafkaProducerService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class ProducerAppApplication {

	public static void main(String[] args) {
		SpringApplication.run(ProducerAppApplication.class, args);
	}

    // 애플리케이션이 시작될 때 이 코드가 자동으로 실행됩니다.
    @Bean
    public CommandLineRunner commandLineRunner(KafkaProducerService producerService) {
        return args -> {
            // "my-first-topic" 이라는 이름의 토픽으로 메시지를 보냅니다.
            producerService.sendMessage("my-first-topic", "Hello, Kafka!");
        };
    }
}
