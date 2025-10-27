package com.example.gateway_service.config;

import io.micrometer.context.ContextSnapshotFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import reactor.core.publisher.Hooks;

/**
 * Micrometer Tracing Context Propagation 설정을 위한 클래스.
 * WebFlux 환경(Gateway)에서 Tracing Context가 손실되는 것을 방지.
 * * 참고: Spring Boot 버전에 따라 자동 설정될 수도 있으나, 명시적으로 설정하면 확실함.
 */
//@Configuration
public class TracingConfig {

    // Spring Boot 3.2+ 에서는 ContextSnapshotFactory 빈이 자동으로 등록될 수 있음.
    // 만약 ContextSnapshotFactory 관련 빈 중복 에러가 발생하면 이 빈은 제거해도 됨.
    @Bean
    public ContextSnapshotFactory contextSnapshotFactory() {
        return ContextSnapshotFactory.builder().build();
    }

    /**
     * Reactor Context와 Micrometer Context Propagation을 연결.
     * 이 설정이 WebFlux 환경에서 Tracing Context 전파의 핵심.
     */
    static {
        Hooks.enableAutomaticContextPropagation();
    }
}
