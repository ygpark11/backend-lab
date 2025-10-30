package com.example.order_service.config;

import com.example.order_service.client.UserServiceClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.ExchangeFilterFunction;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.support.WebClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;

@Configuration
@Slf4j
public class ApiClientConfig {

    // 1. @LoadBalanced WebClient.Builder 빈 등록 (Eureka 연동)
    @Bean
    @LoadBalanced
    public WebClient.Builder webClientBuilder() {
        return WebClient.builder();
    }

    // 2. user-service 호출용 WebClient 빈 등록
    @Bean
    public WebClient userApiWebClient(WebClient.Builder webClientBuilder) {
        return webClientBuilder
                .baseUrl("http://user-service") // 논리적 서비스 이름 사용
                .filter(ExchangeFilterFunction.ofRequestProcessor(req -> {
                    log.info("[WEBCLIENT][REQ] {} {}", req.method(), req.url());
                    return reactor.core.publisher.Mono.just(req);
                }))
                .filter(ExchangeFilterFunction.ofResponseProcessor(res -> {
                    log.info("[WEBCLIENT][RES] status={}", res.statusCode());
                    return reactor.core.publisher.Mono.just(res);
                }))
                .build();
    }

    // 3. UserServiceClient 인터페이스 구현체 빈 등록
    @Bean
    public UserServiceClient userServiceClient(WebClient userApiWebClient) {
        HttpServiceProxyFactory factory = HttpServiceProxyFactory
                .builderFor(WebClientAdapter.create(userApiWebClient))
                .build();
        return factory.createClient(UserServiceClient.class);
    }
}
