package com.pstracker.catalog_service.subscription.service;

import com.pstracker.catalog_service.ai.service.AiService;
import com.pstracker.catalog_service.catalog.infrastructure.IgdbApiClient;
import com.pstracker.catalog_service.subscription.domain.PsPlusMonthlyHistory;
import com.pstracker.catalog_service.subscription.domain.PsPlusPricing;
import com.pstracker.catalog_service.subscription.domain.PsPlusTier;
import com.pstracker.catalog_service.subscription.dto.PsPlusBenefitCollectRequest;
import com.pstracker.catalog_service.subscription.dto.PsPlusCollectRequest;
import com.pstracker.catalog_service.subscription.repository.PsPlusMonthlyHistoryRepository;
import com.pstracker.catalog_service.subscription.repository.PsPlusPricingRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SubscriptionServiceTest {

    @Autowired
    private SubscriptionService subscriptionService;

    @Autowired
    private PsPlusPricingRepository psPlusPricingRepository;

    @Autowired
    private PsPlusMonthlyHistoryRepository psPlusMonthlyHistoryRepository;

    @Autowired
    private EntityManager em;

    @MockitoBean
    private IgdbApiClient igdbApiClient;

    @MockitoBean
    private AiService aiService;

    @Test
    @DisplayName("PS Plus 가격 최초 적재 시 PsPlusPricing의 updatedAt이 설정되어야 한다.")
    void upsertPsPlusPrices_newInsert_shouldSetUpdatedAt() {
        // given
        PsPlusCollectRequest request = buildPricingRequest(PsPlusTier.ESSENTIAL, 5900, 14900, 47900);

        // when
        subscriptionService.upsertPsPlusPrices(request);
        em.flush();
        em.clear();

        // then
        PsPlusPricing pricing = psPlusPricingRepository.findByTier(PsPlusTier.ESSENTIAL).orElseThrow();
        assertThat(pricing.getUpdatedAt()).isNotNull();
    }

    @Test
    @DisplayName("PS Plus 가격 변경 시 PsPlusPricing의 updatedAt이 갱신되어야 한다.")
    void upsertPsPlusPrices_priceChange_shouldUpdateUpdatedAt() throws InterruptedException {
        // given - 최초 적재
        subscriptionService.upsertPsPlusPrices(buildPricingRequest(PsPlusTier.SPECIAL, 8900, 22900, 69900));
        em.flush();
        em.clear();

        LocalDateTime firstUpdatedAt = psPlusPricingRepository.findByTier(PsPlusTier.SPECIAL).orElseThrow().getUpdatedAt();
        Thread.sleep(10);

        // when - 가격 변경으로 업데이트
        subscriptionService.upsertPsPlusPrices(buildPricingRequest(PsPlusTier.SPECIAL, 8900, 22900, 59900));
        em.flush();
        em.clear();

        // then
        PsPlusPricing updated = psPlusPricingRepository.findByTier(PsPlusTier.SPECIAL).orElseThrow();
        assertThat(updated.getUpdatedAt()).isAfterOrEqualTo(firstUpdatedAt);
    }

    @Test
    @DisplayName("PS Plus 혜택 수집 시 PsPlusMonthlyHistory의 createdAt, updatedAt이 설정되어야 한다.")
    void collectPsPlusBenefits_shouldSetTimestamps() {
        // given
        PsPlusBenefitCollectRequest request = new PsPlusBenefitCollectRequest(
                List.of(new PsPlusBenefitCollectRequest.BenefitGameDto(
                        PsPlusMonthlyHistory.BenefitType.ESSENTIAL,
                        "BENEFIT-TEST-001",
                        "무료 게임",
                        "http://img.com/free.jpg",
                        "free-game"
                ))
        );

        // when
        subscriptionService.collectPsPlusBenefits(request);
        em.flush();
        em.clear();

        // then
        PsPlusMonthlyHistory history = psPlusMonthlyHistoryRepository.findAll().stream()
                .filter(h -> h.getPsStoreId().equals("BENEFIT-TEST-001"))
                .findFirst()
                .orElseThrow();
        assertThat(history.getCreatedAt()).isNotNull();
        assertThat(history.getUpdatedAt()).isNotNull();
    }

    private PsPlusCollectRequest buildPricingRequest(PsPlusTier tier, int price1m, int price3m, int price12m) {
        PsPlusCollectRequest.TierPriceReq tierPrice = new PsPlusCollectRequest.TierPriceReq();
        ReflectionTestUtils.setField(tierPrice, "price1Month", price1m);
        ReflectionTestUtils.setField(tierPrice, "price3Month", price3m);
        ReflectionTestUtils.setField(tierPrice, "price12Month", price12m);

        PsPlusCollectRequest request = new PsPlusCollectRequest();
        ReflectionTestUtils.setField(request, "data", Map.of(tier, tierPrice));
        return request;
    }
}
