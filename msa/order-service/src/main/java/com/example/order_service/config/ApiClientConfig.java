package com.example.order_service.config;

import com.example.order_service.client.UserServiceClient;
import io.micrometer.context.ContextSnapshot;
import io.micrometer.context.ContextSnapshotFactory;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.client.loadbalancer.reactive.LoadBalancedExchangeFilterFunction;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.reactive.function.client.support.WebClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;

@Configuration
@Slf4j
public class ApiClientConfig {

    // (1) ★★★ 추가 ★★★
    // @LoadBalanced가 자동으로 제공하던 'Load Balancer 필터'를
    // '수동으로' 주입
    @Autowired
    private LoadBalancedExchangeFilterFunction lbFilter;

    // (2) ★★★ 삭제 ★★★
    // Tracing 자동 설정을 비활성화시켰던 '수제 빌더' Bean을 삭제
    /*
    @Bean
    @LoadBalanced
    public WebClient.Builder webClientBuilder() {
        return WebClient.builder();
    }
    */

    @Bean
    public ContextSnapshotFactory contextSnapshotFactory() {
        return ContextSnapshotFactory.builder().build();
    }

    // 2. user-service 호출용 WebClient 빈 등록
    @Bean
    public WebClient userApiWebClient(WebClient.Builder webClientBuilder, ContextSnapshotFactory snapshotFactory) {
        return webClientBuilder
                .baseUrl("http://user-service") // 논리적 서비스 이름 사용
                .filter(lbFilter)
                .filter((request, next) -> {
                    log.info("[WEBCLIENT][REQ] {} {}", request.method(), request.url());
                    return next.exchange(request)
                            .doOnEach(signal -> {
                                if (signal.isOnNext() || signal.isOnError()) {
                                    try (ContextSnapshot.Scope scope =
                                                 snapshotFactory.captureFrom(signal.getContextView()).setThreadLocals()) {

                                        if (signal.isOnNext()) {
                                            log.info("[WEBCLIENT][RES] status={}", signal.get().statusCode());
                                        } else if (signal.isOnError()) {
                                            Throwable e = signal.getThrowable();
                                            if (e instanceof WebClientResponseException ex) {
                                                log.warn("[WEBCLIENT][RES-ERR] status={}", ex.getStatusCode());
                                            } else {
                                                log.error("[WEBCLIENT][RES-ERR] Error", e);
                                            }
                                        }

                                    }
                                }
                            });
                })
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
