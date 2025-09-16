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
            // 메시지를 6번 보내는 반복문 추가
            for (int i = 1; i <= 6; i++) {
                producerService.sendMessage("my-first-topic", "Message #" + i);
                // 메시지 사이에 약간의 시간 간격을 줍니다.
                Thread.sleep(1000);
            }
        };
    }
}
