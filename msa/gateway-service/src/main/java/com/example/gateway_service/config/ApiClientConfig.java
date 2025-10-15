package com.example.gateway_service.config;

import com.example.gateway_service.client.UserServiceClient;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.support.WebClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;

@Configuration
public class ApiClientConfig {

    /**
     * @LoadBalanced 어노테이션을 붙여 유레카를 통한 서비스 디스커버리가 가능한
     * WebClient.Builder를 빈으로 등록합니다.
     * OpenFeign의 '@FeignClient(name="user-service")' 와 같은 역할을 합니다.
     */
    @Bean
    @LoadBalanced
    public WebClient.Builder webClientBuilder() {
        return WebClient.builder();
    }

    /**
     * 위에서 만든 빌더를 사용하여 'user-service'로 요청을 보낼 WebClient 인스턴스를 생성합니다.
     */
    @Bean
    public WebClient userApiWebClient(WebClient.Builder webClientBuilder) {
        return webClientBuilder
                .baseUrl("http://user-service") // 요청의 기본 URL을 'user-service'로 설정합니다.
                .build();
    }

    /**
     * userApiWebClient를 사용하여 UserServiceClient 인터페이스의 구현체를 생성합니다.
     * 이 코드가 바로 Feign의 @EnableFeignClients 와 @FeignClient 어노테이션이 하던
     * 모든 복잡한 설정을 대체합니다.
     */
    @Bean
    public UserServiceClient userServiceClient(WebClient userApiWebClient) {
        HttpServiceProxyFactory factory = HttpServiceProxyFactory
                .builderFor(WebClientAdapter.create(userApiWebClient)) // WebClient를 사용하도록 설정
                .build();

        return factory.createClient(UserServiceClient.class); // 인터페이스를 기반으로 구현체 생성
    }
}
