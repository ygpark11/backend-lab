package com.example.producer_app;

import com.example.producer_app.dto.MyMessage;
import com.example.producer_app.service.KafkaProducerService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import java.util.UUID;

@SpringBootApplication
public class ProducerAppApplication {

	public static void main(String[] args) {
		SpringApplication.run(ProducerAppApplication.class, args);
	}

    @Bean
    public CommandLineRunner commandLineRunner(KafkaProducerService producerService) {
        return args -> {
            // 1. 정상적인 JSON 메시지 전송
            producerService.sendMessage("my-first-topic",
                    new MyMessage(UUID.randomUUID().toString(), "id-001", "This is a normal message."));

            // 2. 비정상적인 '독약' 메시지 전송 (JSON 형식이 아님)
            producerService.sendPlainString("my-first-topic", "This is a poison pill!");
        };
    }
}
