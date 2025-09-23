package com.example.consumer_app.config;

import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.boot.autoconfigure.kafka.KafkaProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.*;
import org.springframework.kafka.listener.CommonErrorHandler;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.kafka.support.serializer.JsonSerializer;
import org.springframework.util.backoff.FixedBackOff;

import java.util.Map;

@Slf4j
@Configuration
public class KafkaConfig {

    // ConsumerFactory (application.yml 의 ErrorHandlingDeserializer 설정 사용)
    @Bean
    public ConsumerFactory<String, Object> consumerFactory(KafkaProperties props) {
        Map<String, Object> map = props.buildConsumerProperties(null);
        return new DefaultKafkaConsumerFactory<>(map);
    }

    // DLT 퍼블리시용 ProducerFactory (JsonSerializer 사용)
    @Bean
    public ProducerFactory<String, Object> dltProducerFactory(KafkaProperties properties) {
        Map<String, Object> props = properties.buildProducerProperties(null);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        // 필요 시 타입 헤더 제거(선택): props.put(JsonSerializer.ADD_TYPE_INFO_HEADERS, false);
        return new DefaultKafkaProducerFactory<>(props);
    }

    @Bean
    public KafkaTemplate<String, Object> dltKafkaTemplate(ProducerFactory<String, Object> dltProducerFactory) {
        return new KafkaTemplate<>(dltProducerFactory);
    }

    @Bean
    public CommonErrorHandler errorHandler(KafkaTemplate<String, Object> dltKafkaTemplate) {
        DeadLetterPublishingRecoverer recoverer = new DeadLetterPublishingRecoverer(
                dltKafkaTemplate,
                // 원본 partition 유지 + topic.DLT 규칙 강제
                (record, ex) -> new TopicPartition(record.topic() + ".DLT", record.partition())
        );

        DefaultErrorHandler handler = new DefaultErrorHandler(recoverer, new FixedBackOff(1000L, 2));
        handler.setRetryListeners((record, ex, attempt) -> {
            Object v = record.value();
            log.warn("Retry attempt={}, valueClass={}, value={}, ex={}",
                    attempt,
                    (v == null ? "null" : v.getClass().getName()),
                    v,
                    ex.getMessage());
        });
        return handler;
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, Object> mainListenerContainerFactory(
            ConsumerFactory<String, Object> consumerFactory,
            CommonErrorHandler errorHandler) {
        ConcurrentKafkaListenerContainerFactory<String, Object> f = new ConcurrentKafkaListenerContainerFactory<>();
        f.setConsumerFactory(consumerFactory);
        f.setCommonErrorHandler(errorHandler);
        return f;
    }

    // DLT 소비용 (문자열로 조회)
    @Bean
    public ConsumerFactory<String, String> stringConsumerFactory(KafkaProperties props) {
        Map<String, Object> map = props.buildConsumerProperties(null);
        map.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        map.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        return new DefaultKafkaConsumerFactory<>(map);
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, String> dltListenerContainerFactory(
            ConsumerFactory<String, String> stringConsumerFactory) {
        ConcurrentKafkaListenerContainerFactory<String, String> f = new ConcurrentKafkaListenerContainerFactory<>();
        f.setConsumerFactory(stringConsumerFactory);
        return f;
    }
}
