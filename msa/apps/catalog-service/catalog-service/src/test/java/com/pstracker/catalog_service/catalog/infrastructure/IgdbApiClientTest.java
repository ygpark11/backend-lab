package com.pstracker.catalog_service.catalog.infrastructure;

import com.pstracker.catalog_service.catalog.dto.igdb.IgdbGameResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest // application.yml의 진짜 IGDB Key를 읽어와서 실제 API를 호출합니다!
class IgdbApiClientTest {

    /*@Autowired
    private IgdbApiClient igdbApiClient;

    @Test
    @DisplayName("IGDB API 실제 연동 테스트: 위쳐 3 한글명 및 평점 추출 확인")
    void testSearchGame_FinalFantasy() {
        // Given (검색할 찐 영문 타이틀)
        String targetGame = "The Witcher 3: Wild Hunt";

        // When (실제 IGDB API 호출)
        IgdbGameResponse response = igdbApiClient.searchGame(targetGame);

        // Then (결과 출력 및 검증)
        assertNotNull(response, "🚨 IGDB에서 응답을 받지 못했습니다! (API Key나 네트워크 확인)");

        System.out.println("\n=================================================");
        System.out.println("🎮 [검색된 게임 원본명] : " + response.name());
        System.out.println("⭐ [IGDB 평점 / 리뷰수] : " + response.criticScore() + " / " + response.totalRatingCount());

        boolean foundKorean = false;

        if (response.alternativeNames() != null && !response.alternativeNames().isEmpty()) {
            System.out.println("📝 [번역명 / 대체 이름 목록]");
            for (var alt : response.alternativeNames()) {
                System.out.println("   - " + alt.name() + " (비고: " + alt.comment() + ")");

                // 한글 정규식으로 한글명이 포함되어 있는지 확인!
                if (alt.name().matches(".*[ㄱ-ㅎㅏ-ㅣ가-힣]+.*")) {
                    System.out.println("   🎉 [찾았다 요놈! 한글명 매칭 성공] -> " + alt.name());
                    foundKorean = true;
                }
            }
        } else {
            System.out.println("❌ 대체 이름 데이터가 없습니다. (쿼리에 alternative_names 추가했는지 확인!)");
        }
        System.out.println("=================================================\n");

        // (선택) 무조건 한글명을 하나 이상 가져와야만 테스트 성공으로 처리하고 싶다면 아래 주석 해제
        // assertTrue(foundKorean, "한글 이름을 찾지 못했습니다!");
    }*/
}
