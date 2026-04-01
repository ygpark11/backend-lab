package com.pstracker.catalog_service.ai.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pstracker.catalog_service.catalog.domain.Game;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
public class AiService {

    private final String apiKey;
    private final ObjectMapper objectMapper;
    private static final String MODEL_NAME = "gemini-2.5-flash";
    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL_NAME + ":generateContent";

    public AiService(@Value("${spring.ai.openai.api-key}") String apiKey, ObjectMapper objectMapper) {
        this.apiKey = apiKey;
        this.objectMapper = objectMapper;
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

    public List<AiInsightDto> generateBatchInsights(List<Game> games) {
        try {
            // 1. 요청할 5개 게임 목록 조립
            String gameListText = games.stream()
                    .map(g -> "{id: " + g.getId() + ", title: '" + g.getName() + "'}")
                    .collect(Collectors.joining(", "));

            // 2. 프롬프트 작성 (JSON 응답 강제)
            String prompt = """
                너는 게임 큐레이터야. 다음 게임들의 3줄 요약(summary)과 감성 태그 3개(vibeTags)를 분석해줘.
                
                [조건]
                1. 태그는 반드시 다음 목록에서만 3개를 골라야 해: %s
                2. 응답은 무조건 마크다운 없이 순수한 JSON 배열 형태로만 반환해.
                3. 형식: [{"id": 게임ID, "summary": "3줄 요약", "vibeTags": ["#태그1", "#태그2", "#태그3"]}]
                
                [대상 게임]
                %s
                """.formatted(ALLOWED_TAGS, gameListText);

            String responseJson = callGemini(prompt);

            if (responseJson != null) {
                // 마크다운 백틱 제거 후 파싱
                responseJson = responseJson.replace("```json", "").replace("```", "").trim();
                return objectMapper.readValue(responseJson, new TypeReference<List<AiInsightDto>>() {});
            }
        } catch (Exception e) {
            log.error("❌ AI 배치 처리 실패", e);
        }
        return List.of();
    }

    private String callGemini(String prompt) {
        RestClient restClient = RestClient.create();
        GeminiRequest request = new GeminiRequest(List.of(new Content(List.of(new Part(prompt)))));

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

    public record AiInsightDto(Long id, String summary, List<String> vibeTags) {}
    record GeminiRequest(List<Content> contents) {}
    record Content(List<Part> parts) {}
    record Part(String text) {}
    record GeminiResponse(List<Candidate> candidates) {}
    record Candidate(Content content) {}
}