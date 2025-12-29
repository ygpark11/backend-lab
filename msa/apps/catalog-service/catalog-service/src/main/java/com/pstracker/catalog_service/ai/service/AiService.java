package com.pstracker.catalog_service.ai.service; // 👈 패키지 위치 확인!

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiService {

    @Value("${spring.ai.openai.api-key}")
    private String apiKey;

    // Gemini의 '진짜' OpenAI 호환 주소로 명시적으로 지정
    private static final String GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

    /**
     * (큐레이터)
     * RestClient를 사용해 Gemini에게 직접 HTTP 요청을 보냅니다.
     */
    public String summarizeGame(String gameTitle) {
        try {
            RestClient restClient = RestClient.create();

            String prompt = String.format(
                    "PlayStation 게임 '%s'에 대해 한국어로 3줄 이내로 흥미진진하게 요약 설명해줘. " +
                            "평범한 설명보다는 게이머가 사고 싶게 만드는 문체로 부탁해.",
                    gameTitle
            );

            // 요청 본문 (JSON) 생성
            Map<String, Object> requestBody = Map.of(
                    "model", "gemini-1.5-flash", // 👈 모델명 고정
                    "messages", List.of(
                            Map.of("role", "user", "content", prompt)
                    ),
                    "temperature", 0.7
            );

            // API 호출
            Map response = restClient.post()
                    .uri(GEMINI_URL)
                    .header("Authorization", "Bearer " + apiKey) // API Key 헤더
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(Map.class);

            // 응답 파싱 (OpenAI 포맷: choices[0].message.content)
            return parseContent(response);

        } catch (Exception e) {
            // AI 서버가 아프거나 요청이 실패해도 우리 서버는 죽지 않게 로그만 남김
            log.error("❌ Gemini API Call Failed for '{}': {}", gameTitle, e.getMessage());
            return null;
        }
    }

    /**
     * [Feature B] 맞춤 추천 (취향 저격수)
     */
    public String recommendGames(List<String> myWishlistTitles, List<String> candidateTitles) {
        try {
            RestClient restClient = RestClient.create();

            String prompt = String.format(
                    "나는 이런 게임들을 좋아해: %s. \n" +
                            "다음 후보 게임 목록 중에서 나에게 가장 잘 맞을 것 같은 게임 3개를 추천해주고 그 이유를 짧게 말해줘: %s. \n" +
                            "대답은 반드시 JSON 형식으로 줘. (형식: [{\"title\": \"게임명\", \"reason\": \"추천이유\"}])",
                    String.join(", ", myWishlistTitles),
                    String.join(", ", candidateTitles)
            );

            Map<String, Object> requestBody = Map.of(
                    "model", "gemini-1.5-flash",
                    "messages", List.of(
                            Map.of("role", "user", "content", prompt)
                    ),
                    "temperature", 0.7
            );

            Map response = restClient.post()
                    .uri(GEMINI_URL)
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(Map.class);

            return parseContent(response);

        } catch (Exception e) {
            log.error("❌ Gemini Recommendation Failed: {}", e.getMessage());
            return "[]";
        }
    }

    /**
     * 응답에서 content 부분만 파싱
     * @param response Gemini 응답 맵
     * @return content 문자열 또는 null
     */
    private String parseContent(Map response) {
        try {
            if (response == null) return null;
            List choices = (List) response.get("choices");
            if (choices == null || choices.isEmpty()) return null;

            Map firstChoice = (Map) choices.get(0);
            Map message = (Map) firstChoice.get("message");
            return (String) message.get("content");
        } catch (Exception e) {
            log.warn("⚠️ 응답 파싱 실패");
            return null;
        }
    }
}