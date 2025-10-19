package com.example.coupon_service.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    // 1. Exchange 정의 (user-service의 것과 이름/종류가 동일해야 함)
    @Bean
    TopicExchange userExchange() {
        return new TopicExchange("user.exchange");
    }

    // 2. Queue 정의 (이 큐에서 메시지를 꺼내갈 것임)
    @Bean
    Queue couponQueue() {
        return new Queue("user.coupon.queue");
    }

    // 3. Exchange와 Queue를 'Routing Key'로 연결 (Binding)
    @Bean
    Binding binding(Queue couponQueue, TopicExchange userExchange) {
        return BindingBuilder.bind(couponQueue)
                .to(userExchange)
                .with("user.created"); // "user.created" 키로 온 메시지를 couponQueue로!
    }
}