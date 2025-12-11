package com.pstracker.catalog_service.catalog.infrastructure;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.util.StringUtils;

import java.text.Normalizer;

@SpringBootTest
class IgdbApiClientTest {
    @Autowired
    private IgdbApiClient igdbApiClient;

    @Test
    void manualSearchTest() {
        // 1. 내가 확인하고 싶은 게임 제목을 여기에 적으세요.
        // (정규화 로직이 적용된 상태라고 가정하고 입력)
        // String targetTitle = "철권 8";

        String targetTitle = "Cult of the Lamb: Sinful Edition"; // 이것도 해보세요


        String normalizeTitle = normalizeTitle(targetTitle);
        System.out.println("🔎 Searching IGDB for: " + normalizeTitle);

        var result = igdbApiClient.searchGame(normalizeTitle);

        if (result != null) {
            System.out.println("✅ Found: " + result.name());
            System.out.println("   - ID: " + result.id());
            System.out.println("   - Meta Score: " + result.criticScore());
            System.out.println("   - User Score: " + result.userScore());
        } else {
            System.out.println("❌ Not Found (IGDB가 이 제목을 모릅니다)");
        }
    }

    private String normalizeTitle(String rawTitle) {
        if (!StringUtils.hasText(rawTitle)) return "";

        String result = rawTitle.strip();

        // 0. 악센트 제거 (Ragnarök -> Ragnarok)
        result = Normalizer.normalize(result, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");

        result = result
                // 1. 인코딩/전각 문자 정리
                .replaceAll("â€™", "'")
                .replaceAll("â¢", "")
                .replaceAll("[™®]", "")
                .replaceAll("＆", "&")

                // 2. 괄호/대괄호 제거
                .replaceAll("\\(.*?\\)", "")
                .replaceAll("\\[.*?\\]", "")

                // 3. 플랫폼/데모 제거
                .replaceAll("(?i)\\b(PS4|PS5|PS\\s?VR2|PS\\s?VR)\\b", "")
                .replaceAll("(?i)PlayStation\\s*Hits", "")
                .replaceAll("(?i)\\b(demo|trial)\\b", "")

                // 4. [업데이트] 에디션 키워드 추가 (sinful, ritual, rebuild, deadman)
                // sinful, ritual 등이 추가되어 "Sinful Edition" 패턴이 삭제됩니다.
                .replaceAll("(?i)\\b((standard|deluxe|ultimate|premium|collector's|complete|digital|director's|game of the year|goty|cross-gen|launch|special|anniversary|sound|anime|music|bgm|gold|silver|platinum|definitive|expanded|master|legacy|galactic|unlimited|championship|contribution|franchise|evolved|extras|year\\s*\\d+|ragnarok|valhalla|sinful|ritual|rebuild|deadman)\\s*)+(edition|cut|ver|version|bundle|pack|set|collection|anthology)\\b", "")

                // 4-1. 잔여 형용사 정리
                .replaceAll("(?i)\\b(digital|deluxe|premium|standard|ultimate|anniversary|gold|silver|platinum|definitive|expanded|master|legacy|galactic|unlimited|championship|contribution|franchise|evolved|extras|sinful|ritual|rebuild|deadman)\\s*$", "")

                // 5. 구두점 정리
                .replaceAll("[:\\-,&\\+]", " ")

                // 6. 공백 정리
                .replaceAll("\\s+", " ").strip();

        return result;
    }
}