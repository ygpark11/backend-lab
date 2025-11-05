package com.example.order_service.config;

import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Hooks;

@Component
public class ReactorContextPropagationInitializer {

    @PostConstruct
    public void init() {
        Hooks.enableAutomaticContextPropagation();
    }
}
