package com.example.gateway_service.config;

import org.springframework.boot.autoconfigure.http.HttpMessageConverters;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

//@Configuration
public class FeignConfig {

    /**
     * Spring Cloud Gateway는 WebFlux 기반이므로 기본적으로 HttpMessageConverters 빈이 없다.
     * Blocking 방식인 OpenFeign은 이 빈을 필요로 하므로, 수동으로 생성해준다.
     * @return HttpMessageConverters
     */
    /*@Bean
    public HttpMessageConverters httpMessageConverters() {
        return new HttpMessageConverters();
    }*/
}
