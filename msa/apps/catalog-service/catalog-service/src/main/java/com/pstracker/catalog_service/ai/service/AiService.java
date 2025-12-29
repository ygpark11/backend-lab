package com.pstracker.catalog_service.ai.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiService {

    private final ChatClient chatClient;

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

            String response = chatClient.prompt()
                    .user(prompt)
                    .call()
                    .content();

            log.info("🤖 Gemini Summary Generated for '{}'", gameTitle);
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

            return chatClient.prompt()
                    .user(prompt)
                    .call()
                    .content();

        } catch (Exception e) {
            log.error("❌ Gemini Recommendation Failed", e);
            return "[]";
        }
    }
}
