package com.pstracker.catalog_service.ai.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.domain.tag.TagTaxonomyRegistry;
import com.pstracker.catalog_service.global.client.gemini.GeminiApiClient;
import com.pstracker.catalog_service.global.client.gemini.dto.GeminiContent;
import com.pstracker.catalog_service.global.client.gemini.dto.GeminiPart;
import com.pstracker.catalog_service.global.client.gemini.dto.GeminiRequest;
import com.pstracker.catalog_service.global.client.gemini.dto.GeminiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpServerErrorException;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiService {

    @Value("${spring.ai.openai.api-key}")
    private String apiKey;

    private final ObjectMapper objectMapper;
    private final TagTaxonomyRegistry taxonomyRegistry;
    private final GeminiApiClient geminiApiClient;

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
                    .map(g -> {
                        // 한글 포함 여부로 힌트 제공 (AI가 최종 판단)
                        String nameType = g.getName().matches(".*[가-힣].*") ? "korean" : "english";
                        StringBuilder entry = new StringBuilder();
                        entry.append("{id: ").append(g.getId())
                             .append(", title: '").append(g.getName().replace("'", "\\'")).append("'")
                             .append(", nameType: '").append(nameType).append("'");
                        // englishName이 있으면 추가 컨텍스트로 제공 (한글명 키워드 생성에 활용)
                        if (g.getEnglishName() != null && !g.getEnglishName().isBlank()) {
                            entry.append(", englishName: '").append(g.getEnglishName().replace("'", "\\'")).append("'");
                        }
                        entry.append("}");
                        return entry.toString();
                    })
                    .collect(Collectors.joining(", "));

            String allowedTags = taxonomyRegistry.getAllAllowedTagsAsString();

            String prompt = """
                너는 수많은 게임의 본질을 꿰뚫어보는 트렌디한 전문 게임 큐레이터야.
                다음 게임들의 상세 정보를 바탕으로 유저의 구매욕을 자극하는 '3줄 요약(summary)', 핵심 '감성 태그(vibeTags)', 그리고 한국 유저를 위한 '검색 키워드(searchKeywords)'를 추출해 줘.

                [조건 - vibeTags]
                1. [태그 풀 엄수]: 태그는 반드시 아래 제공된 카테고리별 목록에서만 골라야 해. 임의로 새로운 태그나 기호를 창작하면 절대 안 돼.
                %s

                2. [태그 개수]: 너무 지엽적인 특징은 버리고, 유저가 이 게임을 플레이하며 느낄 '핵심 감성' 위주로 최소 3개에서 최대 5개의 태그만 골라줘.
                3. [입체적 밸런스]: 한쪽 카테고리에 쏠리지 않도록 주의해. (액션, 탐험, 도전, 스토리, 예술, 힐링, 소셜) 등 다양한 관점을 골고루 고려해서 게임의 매력이 입체적으로 드러나게 구성해.
                4. [중복 허용]: 단, 게임의 핵심 매력을 완벽히 표현한다면 특정 대분류에서 2개 이상 중복 선택해도 좋아.
                5. [요약 퀄리티]: 'summary'는 기계적인 사실 나열을 피하고, 게이머의 호기심을 자극하는 매력적인 문투로 3문장(약 150자 내외)으로 작성해 줘.

                [조건 - searchKeywords]
                searchKeywords 생성 전에 title을 아래 순서로 전처리해서 핵심 게임 이름만 추출해.

                [전처리]
                - 쉼표로 구분된 언어 목록 괄호 전체 제거: (중국어(간체자), 한국어, 영어, ...) 형식
                - 단일 판본 표시 괄호 제거: (한국어판), (영어판) 등
                - 플랫폼 태그 제거: PS4 & PS5, PS4, PS5
                - 특수 기호 제거: ™, ®, !
                - PlayStation®Hits 라벨 제거
                - 에디션/번들 수식어 제거: 디지털 디럭스 에디션, 얼티밋 에디션, 컴플리트 에디션, 디렉터스 컷, 세대 호환 번들, 더블 디럭스 세트 등
                - 대시(-) 뒤 번들/세트 설명어는 대시와 함께 제거
                - 콜론(:) 뒤는 문맥 판단: 부제목이면 유지 (예: "퍼스트 버서커: 카잔" → 유지), 에디션/번들이면 제거

                [분류 - 전처리된 핵심 이름 기준]
                A. 한글 기반 (한글이 주를 이루는 경우, 음차 표기 포함)
                   - nameType 힌트가 'korean'이어도 영문이 핵심 타이틀이면 B로 분류할 것
                   - 생성: 한국 유저가 줄여 부르는 한글 축약어만, 최대 3개 이하
                   - 예) "어쌔신 크리드 섀도우스" → ["어크섀도우스", "어크섀"]

                B. 영문 기반 (영어가 주를 이루는 경우)
                   - englishName이 제공된 경우 참고해서 한글 키워드 생성
                   - 생성: 한글 풀네임 + 한글 축약어를 우선으로, 최대 5개 이하
                   - 로마 숫자(II, III, IV...)는 아라비아 숫자(2, 3, 4...)로 변환 가능
                   - 게이머들이 실제로 검색에 사용하는 영문 약어는 포함 가능 (예: GTA, GTA5, FIFA, MW)
                     단, 일반적으로 알려지지 않은 약어(PPSA 코드 등)는 제외
                   - 예) "Grand Theft Auto V" → ["그랜드테프트오토5", "그랜드테프트오토", "gta5", "gta"]
                   - 예) "Ghost of Tsushima" → ["쓰시마의고스트", "고스트오브쓰시마", "고오쓰"]

                C. 번들/컬렉션 (A + B 형식 또는 두 타이틀이 합쳐진 경우)
                   - 각 타이틀의 한글명/축약어 조합, 최대 5개 이하
                   - 예) "Monster Hunter Rise + Sunbreak" → ["몬스터헌터라이즈", "몬헌라이즈", "선브레이크", "몬헌"]

                [공통 규칙]
                - 자연스러운 키워드가 없으면 빈 배열 [] (억지로 채우지 말 것)
                - title, englishName과 동일한 값은 제외
                - 모든 키워드는 소문자로 통일
                - 키워드 하나당 최대 50자, 전체 최대 5개

                [공통 조건]
                응답은 마크다운(```json 등) 없이 순수한 JSON 배열 형태로만 반환해.

                [JSON 응답 예시]
                [
                  {
                    "id": 123,
                    "summary": "한국어로 작성된 3줄 이내의 흥미진진한 요약...",
                    "vibeTags": ["#사이버펑크", "#눈호강그래픽", "#타격감원탑", "#시간순삭"],
                    "searchKeywords": ["파판7리버스", "파판7"]
                  },
                  {
                    "id": 456,
                    "summary": "한국어 게임 예시...",
                    "vibeTags": ["#액션RPG", "#스토리맛집"],
                    "searchKeywords": ["어크섀도우스", "어크섀"]
                  }
                ]

                [대상 게임]
                %s
                """.formatted(allowedTags, gameListText);

            String responseJson = callGemini(prompt);

            if (responseJson != null) {
                responseJson = responseJson.replace("```json", "").replace("```", "").trim();
                return objectMapper.readValue(responseJson, new TypeReference<List<AiInsightDto>>() {});
            }
        } catch (org.springframework.web.client.HttpClientErrorException.TooManyRequests e) {
            throw e;
        } catch (Exception e) {
            log.error("❌ AI 배치 처리 실패", e);
        }
        return List.of();
    }

    private String callGemini(String prompt) {
        int maxRetries = 3;
        long waitTime = 30_000;

        GeminiRequest request = new GeminiRequest(List.of(new GeminiContent(List.of(new GeminiPart(prompt)))));

        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                GeminiResponse response = geminiApiClient.generateContent(apiKey, request);

                if (response != null && response.candidates() != null && !response.candidates().isEmpty()) {
                    return response.candidates().getFirst().content().parts().getFirst().text();
                }
                return null;

            } catch (org.springframework.web.client.HttpClientErrorException.TooManyRequests e) {
                log.error("Gemini API 일일 할당량(Quota) 초과. 더 이상 호출할 수 없습니다.");
                throw e;
            } catch (HttpServerErrorException.ServiceUnavailable e) {
                // 503 에러 발생 시
                log.warn("Gemini 서버 503 과부하. {}ms 후 재시도 (시도: {}/{})", waitTime, attempt, maxRetries);
                if (attempt == maxRetries) throw e; // 끝까지 안되면 에러 던짐

                try {
                    Thread.sleep(waitTime);
                    waitTime *= 2;
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    return null;
                }
            } catch (Exception e) {
                // 400 등 다른 에러는 즉시 중단
                log.error("Gemini API 일반 오류", e);
                return null;
            }
        }
        return null;
    }

    public record AiInsightDto(Long id, String summary, List<String> vibeTags, List<String> searchKeywords) {}
}
