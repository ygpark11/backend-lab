package com.pstracker.catalog_service.global.client.gemini;

import com.pstracker.catalog_service.global.client.gemini.dto.GeminiRequest;
import com.pstracker.catalog_service.global.client.gemini.dto.GeminiResponse;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PostExchange;

@HttpExchange
public interface GeminiApiClient {

    @PostExchange("/v1beta/models/gemini-2.5-flash:generateContent")
    GeminiResponse generateContent(
            @RequestParam("key") String apiKey,
            @RequestBody GeminiRequest request
    );
}
