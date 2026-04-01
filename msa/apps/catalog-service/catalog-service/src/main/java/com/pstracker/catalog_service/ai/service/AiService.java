package com.pstracker.catalog_service.ai.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.domain.tag.TagTaxonomyRegistry;
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
    private final TagTaxonomyRegistry taxonomyRegistry;

    private static final String MODEL_NAME = "gemini-2.5-flash";
    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL_NAME + ":generateContent";

    public AiService(@Value("${spring.ai.openai.api-key}") String apiKey,
                     ObjectMapper objectMapper,
                     TagTaxonomyRegistry taxonomyRegistry) {
        this.apiKey = apiKey;
        this.objectMapper = objectMapper;
        this.taxonomyRegistry = taxonomyRegistry;
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
            String gameListText = games.stream()
                    .map(g -> "{id: " + g.getId() + ", title: '" + g.getName() + "'}")
                    .collect(Collectors.joining(", "));

            String allowedTags = taxonomyRegistry.getAllAllowedTagsAsString();

            String prompt = """
                너는 게임 큐레이터야. 다음 게임들의 3줄 요약(summary)과 감성 태그(vibeTags)를 분석해줘.
                
                [조건]
                1. [태그 풀 제한]: 태그는 반드시 아래 제공된 카테고리별 목록에서만 골라야 해. 임의로 새로운 태그를 만들면 절대 안 돼.
                %s
                
                2. [선택 개수]: 너무 지엽적인 특징은 배제하고, 유저가 이 게임을 살 때 가장 기대하는 '핵심 정체성' 위주로 최소 3개에서 최대 5개의 태그만 골라줘.
                3. [입체적 밸런스]: 한쪽 카테고리에만 너무 쏠리지 않도록 주의해. 가급적 다양한 대분류(플레이 스타일, 분위기, 난이도, 환경 등)를 골고루 고려해서 게임의 매력이 입체적으로 드러나게 구성해.
                4. [유연한 중복 허용]: 단, 게임의 핵심 매력을 완벽히 표현한다면 특정 대분류에서 여러 개를 중복 선택해도 좋아. (예: 플레이 스타일 카테고리에서 '#오픈월드'와 '#타격감원탑' 동시 선택 가능)
                5. [응답 형식]: 응답은 무조건 마크다운(```json 등) 없이 순수한 JSON 배열 형태로만 반환해.
                
                [JSON 응답 예시]
                [{"id": 게임ID, "summary": "한국어로 작성된 3줄 이내의 흥미진진한 요약...", "vibeTags": ["#태그1", "#태그2", "#태그3", "#태그4"]}]
                
                [대상 게임]
                %s
                """.formatted(allowedTags, gameListText);

            String responseJson = callGemini(prompt);

            if (responseJson != null) {
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