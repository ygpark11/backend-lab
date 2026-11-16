package com.pstracker.catalog_service.subscription.service;

import com.pstracker.catalog_service.ai.service.AiService;
import com.pstracker.catalog_service.subscription.domain.PsPlusMonthlyHistory;
import com.pstracker.catalog_service.subscription.domain.PsPlusPricing;
import com.pstracker.catalog_service.subscription.domain.PsPlusTier;
import com.pstracker.catalog_service.subscription.dto.PsPlusBenefitCollectRequest;
import com.pstracker.catalog_service.subscription.dto.PsPlusCollectRequest;
import com.pstracker.catalog_service.subscription.dto.PsPlusPricingResponse;
import com.pstracker.catalog_service.subscription.repository.PsPlusHistoryRepository;
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

    @Autowired private SubscriptionService subscriptionService;
    @Autowired private PsPlusPricingRepository psPlusPricingRepository;
    @Autowired private PsPlusHistoryRepository psPlusHistoryRepository;
    @Autowired private PsPlusMonthlyHistoryRepository psPlusMonthlyHistoryRepository;
    @Autowired private EntityManager em;

    @MockitoBean private AiService aiService;

    // ==================== 기존 테스트 (유지) ====================

    @Test
    @DisplayName("PS Plus 가격 최초 적재 시 PsPlusPricing의 updatedAt이 설정되어야 한다.")
    void upsertPsPlusPrices_newInsert_shouldSetUpdatedAt() {
        subscriptionService.upsertPsPlusPrices(buildRequest(PsPlusTier.ESSENTIAL, 6500, 17000, 57000));
        em.flush(); em.clear();

        PsPlusPricing pricing = psPlusPricingRepository.findByTier(PsPlusTier.ESSENTIAL).orElseThrow();
        assertThat(pricing.getUpdatedAt()).isNotNull();
    }

    @Test
    @DisplayName("PS Plus 가격 변경 시 PsPlusPricing의 updatedAt이 갱신되어야 한다.")
    void upsertPsPlusPrices_priceChange_shouldUpdateUpdatedAt() throws InterruptedException {
        subscriptionService.upsertPsPlusPrices(buildRequest(PsPlusTier.SPECIAL, 10500, 27500, 89000));
        em.flush(); em.clear();

        LocalDateTime firstUpdatedAt = psPlusPricingRepository.findByTier(PsPlusTier.SPECIAL).orElseThrow().getUpdatedAt();
        Thread.sleep(10);

        subscriptionService.upsertPsPlusPrices(buildRequest(PsPlusTier.SPECIAL, 10500, 27500, 44500));
        em.flush(); em.clear();

        PsPlusPricing updated = psPlusPricingRepository.findByTier(PsPlusTier.SPECIAL).orElseThrow();
        assertThat(updated.getUpdatedAt()).isAfterOrEqualTo(firstUpdatedAt);
    }

    @Test
    @DisplayName("PS Plus 혜택 수집 시 PsPlusMonthlyHistory의 createdAt, updatedAt이 설정되어야 한다.")
    void collectPsPlusBenefits_shouldSetTimestamps() {
        PsPlusBenefitCollectRequest request = new PsPlusBenefitCollectRequest(
                List.of(new PsPlusBenefitCollectRequest.BenefitGameDto(
                        PsPlusMonthlyHistory.BenefitType.ESSENTIAL,
                        "BENEFIT-TEST-001", "무료 게임", "http://img.com/free.jpg", "free-game"
                ))
        );
        subscriptionService.collectPsPlusBenefits(request);
        em.flush(); em.clear();

        PsPlusMonthlyHistory history = psPlusMonthlyHistoryRepository.findAll().stream()
                .filter(h -> h.getPsStoreId().equals("BENEFIT-TEST-001"))
                .findFirst().orElseThrow();
        assertThat(history.getCreatedAt()).isNotNull();
        assertThat(history.getUpdatedAt()).isNotNull();
    }

    // ==================== 조회 응답 (TierPriceDto) 테스트 ====================

    @Test
    @DisplayName("정가 == 판매가(프로모션 없음) 시 TierPriceDto에 할인 정보가 없어야 한다.")
    void getLatestPricing_noPromotion_noDiscountInDto() {
        // given: 1M/3M/12M 모두 정가 == 판매가
        subscriptionService.upsertPsPlusPrices(
                buildRequest(PsPlusTier.ESSENTIAL, 6500, 17000, 57000, 6500, 17000, 57000));
        em.flush(); em.clear();

        // when
        PsPlusPricingResponse response = subscriptionService.getLatestPricing();
        PsPlusPricingResponse.TierPriceDto dto =
                response.pricingData().get(PsPlusTier.ESSENTIAL);

        // then: 정가 노출, 할인 정보 없음
        assertThat(response.isPromotionActive()).isFalse();
        assertThat(response.promotionDiscountRate()).isEqualTo(0);
        assertThat(dto.price12Month()).isEqualTo(57000);
        assertThat(dto.discountPrice12Month()).isNull();
        assertThat(dto.discountRate12Month()).isEqualTo(0);
        assertThat(dto.discountPrice1Month()).isNull();
        assertThat(dto.discountRate1Month()).isEqualTo(0);
    }

    @Test
    @DisplayName("12개월만 프로모션 중일 때 12개월만 할인 정보가 노출되고 1/3개월은 정가만 노출된다.")
    void getLatestPricing_promotionOnly12Month_correctDiscountDto() {
        // given: 1M/3M 정가, 12M만 할인 (57,000 → 28,500 = 50%)
        subscriptionService.upsertPsPlusPrices(
                buildRequest(PsPlusTier.ESSENTIAL, 6500, 17000, 28500, 6500, 17000, 57000));
        em.flush(); em.clear();

        // when
        PsPlusPricingResponse response = subscriptionService.getLatestPricing();
        PsPlusPricingResponse.TierPriceDto dto =
                response.pricingData().get(PsPlusTier.ESSENTIAL);

        // then - 최상위 프로모션 요약 반영
        assertThat(response.isPromotionActive()).isTrue();
        assertThat(response.promotionDiscountRate()).isEqualTo(50);

        // then - 12개월: 정가 노출, 할인가/할인율 정상
        assertThat(dto.price12Month()).isEqualTo(57000);
        assertThat(dto.discountPrice12Month()).isEqualTo(28500);
        assertThat(dto.discountRate12Month()).isEqualTo(50);

        // then - 1개월/3개월: 할인 정보 없음
        assertThat(dto.discountPrice1Month()).isNull();
        assertThat(dto.discountRate1Month()).isEqualTo(0);
        assertThat(dto.discountPrice3Month()).isNull();
        assertThat(dto.discountRate3Month()).isEqualTo(0);
    }

    @Test
    @DisplayName("할인율은 (정가 - 할인가) / 정가 * 100 반올림으로 계산된다.")
    void getLatestPricing_discountRate_roundedCorrectly() {
        // given: 정가 89,000 할인가 58,900 → (89000-58900)/89000 = 33.82...% → 34%
        subscriptionService.upsertPsPlusPrices(
                buildRequest(PsPlusTier.SPECIAL, 10500, 27500, 58900, 10500, 27500, 89000));
        em.flush(); em.clear();

        // when
        PsPlusPricingResponse.TierPriceDto dto =
                subscriptionService.getLatestPricing().pricingData().get(PsPlusTier.SPECIAL);

        // then
        assertThat(dto.discountRate12Month()).isEqualTo(34);
    }

    // ==================== 수집 중복 방지 (isSamePrice) 테스트 ====================

    @Test
    @DisplayName("판매가와 정가 모두 동일하면 이력이 추가로 적재되지 않는다.")
    void upsertPsPlusPrices_samePriceAndOriginal_noAdditionalHistory() {
        // given: 최초 적재
        subscriptionService.upsertPsPlusPrices(
                buildRequest(PsPlusTier.ESSENTIAL, 6500, 17000, 57000, 6500, 17000, 57000));
        em.flush(); em.clear();
        long countAfterFirst = psPlusHistoryRepository.count();

        // when: 동일 가격/정가 재수집
        subscriptionService.upsertPsPlusPrices(
                buildRequest(PsPlusTier.ESSENTIAL, 6500, 17000, 57000, 6500, 17000, 57000));
        em.flush(); em.clear();

        // then: 이력 추가 없음
        assertThat(psPlusHistoryRepository.count()).isEqualTo(countAfterFirst);
    }

    @Test
    @DisplayName("판매가는 동일하나 정가만 변경(소니 공식 가격 인상)되면 이력이 적재된다.")
    void upsertPsPlusPrices_originalPriceChangedOnly_historyRecorded() {
        // given: 최초 적재 (정가 == 판매가)
        subscriptionService.upsertPsPlusPrices(
                buildRequest(PsPlusTier.DELUXE, 13000, 33000, 109000, 13000, 33000, 109000));
        em.flush(); em.clear();
        long countAfterFirst = psPlusHistoryRepository.count();

        // when: 판매가 동일, 12개월 정가만 인상
        subscriptionService.upsertPsPlusPrices(
                buildRequest(PsPlusTier.DELUXE, 13000, 33000, 109000, 13000, 33000, 139000));
        em.flush(); em.clear();

        // then: 정가 변경 감지 → 이력 1건 추가, PsPlusPricing 정가 갱신
        assertThat(psPlusHistoryRepository.count()).isEqualTo(countAfterFirst + 1);
        PsPlusPricing pricing = psPlusPricingRepository.findByTier(PsPlusTier.DELUXE).orElseThrow();
        assertThat(pricing.getOriginalPrice12Month()).isEqualTo(139000);
    }

    @Test
    @DisplayName("프로모션 시작(판매가 인하) 시 이력이 적재된다.")
    void upsertPsPlusPrices_promotionStart_historyRecorded() {
        // given: 평시
        subscriptionService.upsertPsPlusPrices(
                buildRequest(PsPlusTier.ESSENTIAL, 6500, 17000, 57000, 6500, 17000, 57000));
        em.flush(); em.clear();
        long countAfterNormal = psPlusHistoryRepository.count();

        // when: 12개월 프로모션 시작
        subscriptionService.upsertPsPlusPrices(
                buildRequest(PsPlusTier.ESSENTIAL, 6500, 17000, 28500, 6500, 17000, 57000));
        em.flush(); em.clear();

        // then: 이력 1건 추가
        assertThat(psPlusHistoryRepository.count()).isEqualTo(countAfterNormal + 1);
    }

    @Test
    @DisplayName("프로모션 중 동일 가격 재수집 시 이력이 추가되지 않는다.")
    void upsertPsPlusPrices_duringPromotion_samePrice_noAdditionalHistory() {
        // given: 프로모션 적재
        subscriptionService.upsertPsPlusPrices(
                buildRequest(PsPlusTier.ESSENTIAL, 6500, 17000, 28500, 6500, 17000, 57000));
        em.flush(); em.clear();
        long countAfterPromo = psPlusHistoryRepository.count();

        // when: 동일 가격 재수집 (크롤러 중복 실행)
        subscriptionService.upsertPsPlusPrices(
                buildRequest(PsPlusTier.ESSENTIAL, 6500, 17000, 28500, 6500, 17000, 57000));
        em.flush(); em.clear();

        // then: 이력 추가 없음
        assertThat(psPlusHistoryRepository.count()).isEqualTo(countAfterPromo);
    }

    // ==================== 차트 이력 discountRate 테스트 ====================

    @Test
    @DisplayName("이력의 originalPrice가 없으면(크롤러 업데이트 전) 차트 discountRate는 0이다.")
    void getLatestPricing_historyWithoutOriginalPrice_discountRateIsZero() {
        // given: originalPrice 미포함 수집
        subscriptionService.upsertPsPlusPrices(buildRequest(PsPlusTier.ESSENTIAL, 6500, 17000, 28500));
        em.flush(); em.clear();

        // when
        List<PsPlusPricingResponse.PsPlusPriceHistoryDto> history =
                subscriptionService.getLatestPricing()
                        .historyData().get(PsPlusTier.ESSENTIAL).get("price12Month");

        // then: originalPrice fallback = price → discountRate = 0
        assertThat(history).isNotEmpty();
        assertThat(history.get(0).discountRate()).isEqualTo(0);
    }

    @Test
    @DisplayName("이력의 originalPrice가 있으면 차트 discountRate가 정확하게 계산된다.")
    void getLatestPricing_historyWithOriginalPrice_discountRateCorrect() {
        // given: originalPrice 포함 수집 (57,000 → 28,500 = 50%)
        subscriptionService.upsertPsPlusPrices(
                buildRequest(PsPlusTier.ESSENTIAL, 6500, 17000, 28500, 6500, 17000, 57000));
        em.flush(); em.clear();

        // when
        List<PsPlusPricingResponse.PsPlusPriceHistoryDto> history =
                subscriptionService.getLatestPricing()
                        .historyData().get(PsPlusTier.ESSENTIAL).get("price12Month");

        // then: (57000 - 28500) / 57000 * 100 = 50%
        assertThat(history).isNotEmpty();
        assertThat(history.get(0).price()).isEqualTo(28500);
        assertThat(history.get(0).discountRate()).isEqualTo(50);
    }

    // ==================== 헬퍼 ====================

    /** originalPrice/saleEndDate 없이 수집 (크롤러 업데이트 전 기존 방식) */
    private PsPlusCollectRequest buildRequest(PsPlusTier tier, int p1m, int p3m, int p12m) {
        return buildRequest(tier, p1m, p3m, p12m, null, null, null, null, null, null);
    }

    /** originalPrice 포함, saleEndDate 없이 수집 */
    private PsPlusCollectRequest buildRequest(PsPlusTier tier,
                                              int p1m, int p3m, int p12m,
                                              Integer orig1m, Integer orig3m, Integer orig12m) {
        return buildRequest(tier, p1m, p3m, p12m, orig1m, orig3m, orig12m, null, null, null);
    }

    /** originalPrice + saleEndDate 포함 수집 */
    private PsPlusCollectRequest buildRequest(PsPlusTier tier,
                                              int p1m, int p3m, int p12m,
                                              Integer orig1m, Integer orig3m, Integer orig12m,
                                              java.time.LocalDate sed1m, java.time.LocalDate sed3m, java.time.LocalDate sed12m) {
        PsPlusCollectRequest.TierPriceReq tierPrice = PsPlusCollectRequest.TierPriceReq.builder()
                .price1Month(p1m)
                .price3Month(p3m)
                .price12Month(p12m)
                .originalPrice1Month(orig1m)
                .originalPrice3Month(orig3m)
                .originalPrice12Month(orig12m)
                .saleEndDate1Month(sed1m)
                .saleEndDate3Month(sed3m)
                .saleEndDate12Month(sed12m)
                .build();

        return new PsPlusCollectRequest(Map.of(tier, tierPrice));
    }
}
