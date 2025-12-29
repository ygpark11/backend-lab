package com.pstracker.catalog_service.ai.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;

@Slf4j
@Service
public class AiService {

    private final String apiKey;

    private static final String MODEL_NAME = "gemini-2.5-flash";

    // URL 생성
    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL_NAME + ":generateContent";

    public AiService(@Value("${spring.ai.openai.api-key}") String apiKey) {
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
        RestClient restClient = RestClient.create();

        GeminiRequest request = new GeminiRequest(
                List.of(new Content(List.of(new Part(prompt))))
        );

        GeminiResponse response = restClient.post()
                .uri(GEMINI_API_URL + "?key=" + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(GeminiResponse.class);

        if (response != null && response.candidates() != null && !response.candidates().isEmpty()) {
            return response.candidates().get(0).content().parts().get(0).text();
        }
        return null;
    }

    // DTO Records
    record GeminiRequest(List<Content> contents) {}
    record Content(List<Part> parts) {}
    record Part(String text) {}
    record GeminiResponse(List<Candidate> candidates) {}
    record Candidate(Content content, String finishReason, int index) {}
}