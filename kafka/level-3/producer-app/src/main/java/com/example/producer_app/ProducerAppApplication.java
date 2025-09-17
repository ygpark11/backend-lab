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
            // 3개의 다른 키로, 각각 2번씩 메시지를 보냅니다.
            for (int i = 1; i <= 10; i++) {
                producerService.sendMessage("my-first-topic", "key-A", "Message " + i + " for key A");
                Thread.sleep(1000); // 배치 사이에 약간의 텀을 줍니다.
                producerService.sendMessage("my-first-topic", "key-B", "Message " + i + " for key B");
                Thread.sleep(1000); // 배치 사이에 약간의 텀을 줍니다.
                producerService.sendMessage("my-first-topic", "key-C", "Message " + i + " for key C");
                Thread.sleep(1000); // 배치 사이에 약간의 텀을 줍니다.
            }
        };
    }
}
