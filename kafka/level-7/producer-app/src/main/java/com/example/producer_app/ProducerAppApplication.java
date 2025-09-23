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
            producerService.sendMessage("my-first-topic",
                    new MyMessage(UUID.randomUUID().toString(), "This is a normal message."));
            producerService.sendPlainString("my-first-topic", "This is a poison pill!");
        };
    }
}
