package com.example.user_service.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    // 1. Exchange(이름표/발행자) 정의
    // 이름: "user.exchange", 종류: TopicExchange (가장 유연함)
    // 발신자는 오직 Exchange의 존재만 알면 된다.
    @Bean
    TopicExchange userExchange() {
        return new TopicExchange("user.exchange");
    }

    /*
    // 2. Queue 정의 (발신자는 큐를 몰라야 하므로 삭제)
    @Bean
    Queue couponQueue() {
        return new Queue("user.coupon.queue");
    }

    // 3. Exchange와 Queue를 'Routing Key'로 연결 (삭제)
    @Bean
    Binding binding(Queue couponQueue, TopicExchange userExchange) {
        return BindingBuilder.bind(couponQueue)
                             .to(userExchange)
                             .with("user.created");
    }
    */
}
