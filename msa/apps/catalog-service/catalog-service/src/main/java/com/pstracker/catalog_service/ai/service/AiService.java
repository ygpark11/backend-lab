package com.pstracker.catalog_service.ai.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;

@Slf4j
@Service
public class AiService {

    private final RestClient restClient;
    private final String apiKey;

    // ✅ Gemini Native API 공식 주소 (OpenAI 호환 X)
    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

    public AiService(
            RestClient.Builder builder,
            @Value("${spring.ai.openai.api-key}") String apiKey // 키는 그대로 사용
    ) {
        this.restClient = builder
                .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .build();
        this.apiKey = apiKey;
    }

    /**
     * [Feature A] 게임 3줄 요약
     */
    public String summarizeGame(String gameTitle) {
        try {
            String prompt = "PlayStation 게임 '%s'에 대해 한국어로 3줄 이내로 흥미진진하게 요약 설명해줘.".formatted(gameTitle);
            return callGemini(prompt);
        } catch (Exception e) {
            log.error("❌ 요약 실패: {}", gameTitle, e);
            return null;
        }
    }

    /**
     * [Feature B] 맞춤 추천
     */
    public String recommendGames(List<String> myWishlistTitles, List<String> candidateTitles) {
        try {
            String prompt = """
                내 취향: %s.
                후보 목록: %s.
                이 중에서 3개 추천해주고 JSON으로 답해줘.
                형식: [{"title": "...", "reason": "..."}]
                """.formatted(String.join(", ", myWishlistTitles), String.join(", ", candidateTitles));

            return callGemini(prompt);
        } catch (Exception e) {
            log.error("❌ 추천 실패", e);
            return "[]";
        }
    }

    /**
     * 🚀 Gemini Native API 호출 로직
     */
    private String callGemini(String prompt) {
        // 1. Gemini Native 요청 구조 생성
        GeminiRequest request = new GeminiRequest(
                List.of(new Content(List.of(new Part(prompt))))
        );

        // 2. 호출 (API Key는 Query Param으로 붙여야 함)
        GeminiResponse response = restClient.post()
                .uri(GEMINI_API_URL + "?key=" + apiKey) // 👈 중요: 키를 URL 뒤에 붙임
                .body(request)
                .retrieve()
                .body(GeminiResponse.class);

        // 3. 응답 파싱
        if (response != null && !response.candidates().isEmpty()) {
            return response.candidates().get(0).content().parts().get(0).text();
        }
        return null;
    }

    // =============================
    // 📦 Gemini Native DTO Records
    // =============================

    // Request
    record GeminiRequest(List<Content> contents) {}
    record Content(List<Part> parts) {}
    record Part(String text) {}

    // Response
    record GeminiResponse(List<Candidate> candidates) {}
    record Candidate(Content content, String finishReason, int index) {}
}