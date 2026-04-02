package com.pstracker.catalog_service.catalog.infrastructure;

import com.pstracker.catalog_service.catalog.dto.igdb.IgdbGameResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
class IgdbApiClientTest {

    @Autowired
    private IgdbApiClient igdbApiClient;

    /*@Test
    @DisplayName("IGDB 3단계 Fallback 검증: 용과 같이 히어로 에디션")
    void testSearchGame_Yakuza() {
        // Given: 아까 1차에서 Edition 날아가서 실패했던 그 악질 타이틀
        String targetGame = "Yakuza: Like a Dragon";

        // When: 3단계 로직이 적용된 searchGame 호출
        IgdbGameResponse response = igdbApiClient.searchGame(targetGame);

        // Then
        assertNotNull(response, "🚨 3단계 다 거쳤는데도 못 찾았습니다!");

        System.out.println("\n=================================================");
        System.out.println("🎯 [입력한 검색어] : " + targetGame);
        System.out.println("✅ [IGDB 매칭 결과] : " + response.name());
        System.out.println("⭐ [IGDB 전문가 평점] : " + response.criticScore() + " (평가자: " + response.criticCount() + "명)");
        System.out.println("👥 [IGDB 유저 평점]   : " + response.userScore() + " (평가자: " + response.userCount() + "명)");
        System.out.println("📊 [총 리뷰 수 (통합)] : " + response.totalRatingCount() + "명");
        System.out.println("=================================================\n");
    }*/
}