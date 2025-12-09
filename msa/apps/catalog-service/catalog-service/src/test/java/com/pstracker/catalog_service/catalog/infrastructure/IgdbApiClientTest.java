package com.pstracker.catalog_service.catalog.infrastructure;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class IgdbApiClientTest {
    @Autowired
    private IgdbApiClient igdbApiClient;

    @Test
    void manualSearchTest() {
        // 1. 내가 확인하고 싶은 게임 제목을 여기에 적으세요.
        // (정규화 로직이 적용된 상태라고 가정하고 입력)
        // String targetTitle = "철권 8";
        String psStroreId = "HP0700-PPSA10593_00-TEKKEN8000000000";
        String targetTitle = "철권 8"; // 이것도 해보세요

        System.out.println("🔎 Searching IGDB for: " + targetTitle);

        var result = igdbApiClient.searchGame(psStroreId, targetTitle);

        if (result != null) {
            System.out.println("✅ Found: " + result.name());
            System.out.println("   - ID: " + result.id());
            System.out.println("   - Meta Score: " + result.criticScore());
        } else {
            System.out.println("❌ Not Found (IGDB가 이 제목을 모릅니다)");
        }
    }
}