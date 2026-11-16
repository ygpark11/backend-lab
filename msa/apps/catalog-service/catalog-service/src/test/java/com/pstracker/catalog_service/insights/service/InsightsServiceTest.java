package com.pstracker.catalog_service.insights.service;

import com.pstracker.catalog_service.ai.service.AiService;
import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.domain.GamePriceHistory;
import com.pstracker.catalog_service.catalog.repository.GamePriceHistoryRepository;
import com.pstracker.catalog_service.catalog.repository.GameRepository;
import com.pstracker.catalog_service.insights.dto.InsightsSummaryResponse;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class InsightsServiceTest {

    @Autowired
    private InsightsService insightsService;

    @Autowired
    private GameRepository gameRepository;

    @Autowired
    private GamePriceHistoryRepository priceHistoryRepository;

    @Autowired
    private EntityManager em;

    @MockitoBean
    private AiService aiService;

    @Test
    @DisplayName("단일 집계 쿼리로 인사이트 요약 통계를 정확하게 계산한다")
    void getInsightsSummary_aggregatesAllMetricsInSinglePass() {
        insightsService.refreshInsightsCache();

        LocalDate today = LocalDate.now();

        // 1. 머스트플레이 + 역대최저가 + 마감임박 + PS5 Pro + 카탈로그 + 플러스전용 + 숏플레이타임
        Game buyNowGame = Game.create("INS-001", "갓겜1", "God Game 1", "Pub", "img", "desc", today.minusMonths(6));
        buyNowGame.updatePriceSearchInfo(50000, 20000, 60, true, today.plusDays(1), true);
        buyNowGame.updateInfo("갓겜1", "God Game 1", "Pub", "img", "desc", today.minusMonths(6), java.util.Set.of(), true);
        buyNowGame.adminUpdateMetacriticRatings(90, 50, 8.5, 100);
        buyNowGame.updatePlayTimes(8.0, 12.0, 20.0);
        gameRepository.save(buyNowGame);
        priceHistoryRepository.save(GamePriceHistory.create(buyNowGame, 50000, 20000, 60, true, today.plusDays(1), true));

        // 2. 역대최저가 설정 후 Good Offer (+10% 이내) + 미디엄 플레이타임
        Game goodOfferGame = Game.create("INS-002", "괜찮은겜", "Good Game", "Pub", "img", "desc", today.minusMonths(6));
        goodOfferGame.updatePriceSearchInfo(50000, 20000, 60, false, today.plusDays(5), false);
        goodOfferGame.updatePriceSearchInfo(50000, 22000, 56, false, today.plusDays(5), false);
        goodOfferGame.updatePlayTimes(20.0, 30.0, 50.0);
        gameRepository.save(goodOfferGame);

        // 3. 정가(TRACKING) + 에픽 플레이타임
        Game trackingGame = Game.create("INS-003", "정가겜", "Full Price Game", "Pub", "img", "desc", today.minusMonths(6));
        trackingGame.updatePriceSearchInfo(60000, 60000, 0, false, null, false);
        trackingGame.updatePlayTimes(120.0, 150.0, 200.0);
        gameRepository.save(trackingGame);

        em.flush();
        em.clear();

        InsightsSummaryResponse summary = insightsService.getInsightsSummary();

        assertThat(summary.totalTrackedCount()).isEqualTo(3L);
        assertThat(summary.allTimeLowCount()).isEqualTo(1L);
        assertThat(summary.mustPlayCount()).isEqualTo(1L);
        assertThat(summary.totalDiscountedGames()).isEqualTo(2L);
        assertThat(summary.totalDiscountAmount()).isEqualTo((50000L - 20000L) + (50000L - 22000L));
        assertThat(summary.closingSoonCount()).isEqualTo(1L);
        assertThat(summary.newDiscountCount()).isEqualTo(1L);
        assertThat(summary.ps5ProCount()).isEqualTo(1L);
        assertThat(summary.inCatalogCount()).isEqualTo(1L);
        assertThat(summary.plusExclusiveCount()).isEqualTo(1L);
        assertThat(summary.ptShortCount()).isEqualTo(1L);
        assertThat(summary.ptMediumCount()).isEqualTo(1L);
        assertThat(summary.ptEpicCount()).isEqualTo(1L);
        assertThat(summary.verdictBuyNow()).isEqualTo(1L);
        assertThat(summary.verdictGoodOffer()).isEqualTo(1L);
        assertThat(summary.verdictTracking()).isEqualTo(1L);
        assertThat(summary.lastSyncTime()).isNotEqualTo("기록 없음");
    }

    @Test
    @DisplayName("데이터가 0건일 때도 NPE 없이 0과 기본 동기화 문구를 반환한다")
    void getInsightsSummary_emptyDatabase_returnsZerosSafely() {
        insightsService.refreshInsightsCache();

        InsightsSummaryResponse summary = insightsService.getInsightsSummary();

        assertThat(summary.totalTrackedCount()).isEqualTo(0L);
        assertThat(summary.totalDiscountAmount()).isEqualTo(0L);
        assertThat(summary.lastSyncTime()).isEqualTo("기록 없음");
    }
}
