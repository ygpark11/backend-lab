package com.pstracker.catalog_service.search;

import com.pstracker.catalog_service.catalog.domain.Game;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Meilisearch에 색인되는 게임 검색 전용 문서.
 * 가격·할인율 등 실시간 변동 컬럼은 포함하지 않으며, MySQL Game 엔티티의 정적 메타데이터에서 파생 생성된다.
 */
public record GameSearchDocument(
        Long id,
        String displayName,
        String imageUrl,
        String name,
        String englishName,
        String searchKeywords,
        String chosungAscii,
        String qwertyText,
        int popularity
) {
    public static GameSearchDocument from(Game game) {
        String rawName = game.getName() != null ? game.getName() : "";
        String cleanedName = SearchTextNormalizer.cleanTitle(rawName);
        String nameTokens = SearchTextNormalizer.tokenizeAndSplitKorNum(cleanedName);

        String cleanedEn = SearchTextNormalizer.cleanTitle(game.getEnglishName());
        String enTokens = SearchTextNormalizer.tokenizeAndSplitKorNum(cleanedEn);

        List<String> keywords = game.getSearchKeywords() != null ? game.getSearchKeywords() : List.of();
        String kwJoined = keywords.stream()
                .filter(k -> k != null && !k.isBlank())
                .collect(Collectors.joining(" "));
        String kwTokens = SearchTextNormalizer.tokenizeAndSplitKorNum(kwJoined);

        // 제목과 search_keywords 양쪽에서 ASCII 초성 추출 (영문 원제 게임의 한글 별칭 초성 'ㄱㅇㅆ' 등 지원)
        Set<String> chosungParts = new LinkedHashSet<>();
        String nameChosung = SearchTextNormalizer.toChosungAsciiTokens(cleanedName);
        if (!nameChosung.isEmpty()) {
            chosungParts.add(nameChosung);
        }
        for (String kw : keywords) {
            String kwChosung = SearchTextNormalizer.toChosungAsciiTokens(kw);
            if (!kwChosung.isEmpty()) {
                chosungParts.add(kwChosung);
            }
        }
        String chosungAscii = String.join(" ", chosungParts);

        String qwertyText = SearchTextNormalizer.toQwertyJamo(
                (nameTokens + " " + kwTokens + " " + enTokens).trim()
        );

        return new GameSearchDocument(
                game.getId(),
                rawName,
                game.getImageUrl(),
                nameTokens,
                enTokens,
                kwTokens,
                chosungAscii,
                qwertyText,
                SearchTextNormalizer.computePopularity(game)
        );
    }
}
