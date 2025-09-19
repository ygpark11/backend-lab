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
            // (1) 고유한 ID를 하나 생성합니다.
            String uniqueId = UUID.randomUUID().toString();

            // (2) 생성한 ID를 담아 첫 번째 메시지를 보냅니다.
            producerService.sendMessage("my-first-topic",
                    new MyMessage(uniqueId, "id-123", "This is an idempotent test message!"));

            // (3) 1초 후, 똑같은 uniqueId를 가진 메시지를 한 번 더 보냅니다. (중복 발생!)
            Thread.sleep(1000);
            producerService.sendMessage("my-first-topic",
                    new MyMessage(uniqueId, "id-123", "This is an idempotent test message!"));
        };
    }
}
