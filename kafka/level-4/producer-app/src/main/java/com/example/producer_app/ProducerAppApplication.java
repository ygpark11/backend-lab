package com.example.producer_app;

import com.example.producer_app.dto.MyMessage;
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

    @Bean
    public CommandLineRunner commandLineRunner(KafkaProducerService producerService) {
        return args -> {
            // String 대신 MyMessage 객체를 생성해서 전송
            producerService.sendMessage("my-first-topic",
                    new MyMessage("id-123", "Hello, this is my first JSON message!"));
        };
    }
}
