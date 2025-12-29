package com.pstracker.catalog_service.ai.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;

@Slf4j
@Service
public class AiService {

    private final RestClient restClient;
    private final String model;
    private final double temperature;

    public AiService(
            RestClient.Builder builder,
            @Value("${spring.ai.openai.api-key}") String apiKey,
            @Value("${spring.ai.openai.base-url}") String baseUrl,
            @Value("${spring.ai.openai.chat.options.model}") String model,
            @Value("${spring.ai.openai.chat.options.temperature}") double temperature
    ) {
        this.restClient = builder
                .baseUrl(baseUrl)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();

        this.model = model;
        this.temperature = temperature;
    }

    /**
     * [Feature A] 게임 3줄 요약 (큐레이터)
     */
    public String summarizeGame(String gameTitle) {
        try {
            String prompt = """
                PlayStation 게임 '%s'에 대해
                한국어로 3줄 이내로 흥미진진하게 요약 설명해줘.
                평범한 설명보다는 게이머가 사고 싶게 만드는 문체로 부탁해.
                """.formatted(gameTitle);

            String response = callGemini(prompt);

            if (response != null) {
                log.info("🤖 Gemini Summary Generated for '{}'", gameTitle);
            }
            return response;

        } catch (Exception e) {
            log.error("❌ Gemini Summary Failed for '{}'", gameTitle, e);
            return null;
        }
    }

    /**
     * [Feature B] 맞춤 추천 (취향 저격수)
     */
    public String recommendGames(List<String> myWishlistTitles, List<String> candidateTitles) {
        try {
            String prompt = """
                나는 이런 게임들을 좋아해: %s
                다음 후보 게임 목록 중에서 나에게 가장 잘 맞을 것 같은 게임 3개를 추천해주고
                그 이유를 짧게 설명해줘.

                반드시 JSON 형식으로 응답해줘.
                형식:
                [
                  {"title": "게임명", "reason": "추천 이유"}
                ]
                """.formatted(
                    String.join(", ", myWishlistTitles),
                    String.join(", ", candidateTitles)
            );

            return callGemini(prompt);

        } catch (Exception e) {
            log.error("❌ Gemini Recommendation Failed", e);
            return "[]";
        }
    }

    /**
     * 🛠️ 공통 호출 메서드 (Type-Safe with Records)
     */
    private String callGemini(String prompt) {
        // 1. 요청 객체 생성 (Record 사용)
        GeminiRequest request = new GeminiRequest(
                model,
                temperature,
                List.of(new Message("user", prompt))
        );

        try {
            // 2. 호출 및 응답 매핑 (Map 대신 GeminiResponse Record로 받음)
            GeminiResponse response = restClient.post()
                    .uri("/chat/completions")
                    .body(request)
                    .retrieve()
                    .body(GeminiResponse.class); // ✅ 여기가 핵심! 자동 매핑

            // 3. 안전한 데이터 추출 (Getter 사용)
            if (response == null || response.choices() == null || response.choices().isEmpty()) {
                return null;
            }

            return response.choices().get(0).message().content();

        } catch (Exception e) {
            log.warn("⚠️ Gemini Call Error: {}", e.getMessage());
            throw e;
        }
    }

    // 요청 DTO
    private record GeminiRequest(
            String model,
            double temperature,
            List<Message> messages
    ) {}

    // 메시지 DTO (요청/응답 공용)
    private record Message(
            String role,
            String content
    ) {}

    // 응답 DTO (OpenAI 호환 구조)
    private record GeminiResponse(
            List<Choice> choices
    ) {}

    private record Choice(
            Message message,
            @JsonProperty("finish_reason") String finishReason, // JSON 필드명 매핑 예시
            int index
    ) {}
}