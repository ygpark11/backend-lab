package com.pstracker.catalog_service.ai.service; // 👈 패키지 위치 확인!

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiService {

    private final ChatClient.Builder chatClientBuilder;

    /**
     * [Feature A] 게임 3줄 요약 (큐레이터)
     * "이 게임에 대한 설명을 한국어로 3줄 이내로 요약해줘."
     */
    public String summarizeGame(String gameTitle) {
        try {
            // Builder를 사용해 ChatClient 인스턴스 생성 (기본 설정 사용)
            ChatClient chatClient = chatClientBuilder.build();

            String prompt = String.format(
                    "PlayStation 게임 '%s'에 대해 한국어로 3줄 이내로 흥미진진하게 요약 설명해줘. " +
                            "평범한 설명보다는 게이머가 사고 싶게 만드는 문체로 부탁해.",
                    gameTitle
            );

            // Gemini 호출!
            String response = chatClient.prompt()
                    .user(prompt)
                    .call()
                    .content();

            log.info("🤖 Gemini Summary Generated for '{}'", gameTitle);
            return response;

        } catch (Exception e) {
            // AI 서버가 아프거나 요청이 실패해도 우리 서버는 죽지 않게 로그만 남김
            log.error("❌ Gemini API Call Failed for '{}': {}", gameTitle, e.getMessage());
            return null;
        }
    }

    /**
     * [Feature B] 맞춤 추천 (취향 저격수)
     * "내가 찜한 게임들을 보고, 후보군 중에서 추천해줘."
     */
    public String recommendGames(List<String> myWishlistTitles, List<String> candidateTitles) {
        try {
            ChatClient chatClient = chatClientBuilder.build();

            String prompt = String.format(
                    "나는 이런 게임들을 좋아해: %s. \n" +
                            "다음 후보 게임 목록 중에서 나에게 가장 잘 맞을 것 같은 게임 3개를 추천해주고 그 이유를 짧게 말해줘: %s. \n" +
                            "대답은 반드시 JSON 형식으로 줘. (형식: [{\"title\": \"게임명\", \"reason\": \"추천이유\"}])",
                    String.join(", ", myWishlistTitles),
                    String.join(", ", candidateTitles)
            );

            // Gemini 호출!
            return chatClient.prompt()
                    .user(prompt)
                    .call()
                    .content();

        } catch (Exception e) {
            log.error("❌ Gemini Recommendation Failed: {}", e.getMessage());
            return "[]"; // 실패 시 빈 배열 반환
        }
    }
}