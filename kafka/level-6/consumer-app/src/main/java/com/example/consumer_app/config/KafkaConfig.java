package com.example.consumer_app.config;

import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.ByteArraySerializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.boot.autoconfigure.kafka.KafkaProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.listener.CommonErrorHandler;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

import java.util.Map;

@Slf4j
@Configuration
public class KafkaConfig {

    // 1. DLQ 전용 KafkaTemplate을 주입받아 에러 핸들러를 설정합니다.
    @Bean
    public CommonErrorHandler errorHandler(KafkaTemplate<String, byte[]> dltKafkaTemplate) {
        // 재시도에 모두 실패한 메시지를 dltKafkaTemplate을 사용해 DLQ로 보냅니다.
        DeadLetterPublishingRecoverer recoverer = new DeadLetterPublishingRecoverer(dltKafkaTemplate);
        // 1초 간격으로 2번 재시도합니다.
        DefaultErrorHandler errorHandler = new DefaultErrorHandler(recoverer, new FixedBackOff(1000L, 2));

        // 재시도 시 로그를 남기는 리스너를 추가합니다.
        errorHandler.setRetryListeners((record, ex, deliveryAttempt) -> {
            String messageValue = record.value() != null ? new String((byte[]) record.value()) : "null";
            log.warn("Retry listener. message={}, exception={}, attempt={}",
                    messageValue, ex.getMessage(), deliveryAttempt);
        });

        return errorHandler;
    }

    // 2. DLQ로 보낼 메시지의 Value를 byte[]로 직렬화하는 ProducerFactory를 만듭니다.
    @Bean
    public ProducerFactory<String, byte[]> dltProducerFactory(KafkaProperties properties) {
        Map<String, Object> props = properties.buildProducerProperties(null);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, ByteArraySerializer.class);
        return new DefaultKafkaProducerFactory<>(props);
    }

    // 3. 위에서 만든 ProducerFactory를 사용하는 DLQ 전용 KafkaTemplate을 만듭니다.
    @Bean
    public KafkaTemplate<String, byte[]> dltKafkaTemplate(ProducerFactory<String, byte[]> dltProducerFactory) {
        return new KafkaTemplate<>(dltProducerFactory);
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, Object> kafkaListenerContainerFactory(
            ConsumerFactory<String, Object> consumerFactory,
            CommonErrorHandler commonErrorHandler) {
        ConcurrentKafkaListenerContainerFactory<String, Object> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory);
        // 우리가 만든 에러 핸들러를 리스너 컨테이너 팩토리에 공식적으로 등록합니다.
        factory.setCommonErrorHandler(commonErrorHandler);
        return factory;
    }
}