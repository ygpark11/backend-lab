package com.pstracker.catalog_service.subscription.service;

import com.pstracker.catalog_service.global.domain.PriceVerdict;
import com.pstracker.catalog_service.global.util.PriceVerdictCalculator;
import com.pstracker.catalog_service.subscription.domain.PsPlusHistory;
import com.pstracker.catalog_service.subscription.domain.PsPlusPricing;
import com.pstracker.catalog_service.subscription.domain.PsPlusTier;
import com.pstracker.catalog_service.subscription.dto.PsPlusCollectRequest;
import com.pstracker.catalog_service.subscription.dto.PsPlusPricingResponse;
import com.pstracker.catalog_service.subscription.repository.PsPlusHistoryRepository;
import com.pstracker.catalog_service.subscription.repository.PsPlusPricingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.ToIntFunction;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SubscriptionService {

    private final PsPlusPricingRepository psPlusPricingRepository;
    private final PsPlusHistoryRepository psPlusHistoryRepository;

    public PsPlusPricingResponse getLatestPricing() {
        List<PsPlusPricing> pricing = psPlusPricingRepository.findAll();

        if (pricing.isEmpty()) {
            return null;
        }

        Map<PsPlusTier, PsPlusPricingResponse.TierPriceDto> pricingData = pricing.stream()
                .collect(Collectors.toMap(
                        PsPlusPricing::getTier,
                        p -> new PsPlusPricingResponse.TierPriceDto(
                                p.getPrice1Month(), p.getPrice3Month(), p.getPrice12Month(),
                                null, null, null // TODO: 할인가 컬럼 생기면 p.getDiscountPrice12Month() 등으로 매핑
                        )
                ));

        List<PsPlusHistory> allHistories = psPlusHistoryRepository.findAllByOrderByRecordedAtAsc();
        Map<PsPlusTier, List<PsPlusHistory>> historyByTier = allHistories.stream()
                .collect(Collectors.groupingBy(PsPlusHistory::getTier));

        Map<PsPlusTier, Map<String, List<PsPlusPricingResponse.PsPlusPriceHistoryDto>>> historyData = pricing.stream()
                .collect(Collectors.toMap(
                        PsPlusPricing::getTier,
                        p -> {
                            List<PsPlusHistory> tierHistories = historyByTier.getOrDefault(p.getTier(), List.of());

                            return Map.of(
                                    "price1Month", buildHistoryForDuration(tierHistories, PsPlusHistory::getPrice1Month, p.getPrice1Month()),
                                    "price3Month", buildHistoryForDuration(tierHistories, PsPlusHistory::getPrice3Month, p.getPrice3Month()),
                                    "price12Month", buildHistoryForDuration(tierHistories, PsPlusHistory::getPrice12Month, p.getPrice12Month())
                            );
                        }
                ));

        return new PsPlusPricingResponse(
                false,  // TODO: 프로모션 기간 시 로직 변경
                0,
                pricingData,
                historyData
        );
    }

    private List<PsPlusPricingResponse.PsPlusPriceHistoryDto> buildHistoryForDuration(
            List<PsPlusHistory> histories,
            ToIntFunction<PsPlusHistory> priceExtractor,
            Integer originalPrice) {

        Integer lowestPrice = histories.stream()
                .map(priceExtractor::applyAsInt)
                .min(Integer::compareTo)
                .orElse(originalPrice);

        return histories.stream()
                .map(h -> {
                    int historyPrice = priceExtractor.applyAsInt(h);
                    int discountRate = 0; // TODO: h.getDiscountRate()

                    PriceVerdict verdict = PriceVerdictCalculator.forSubscription(historyPrice, originalPrice, lowestPrice, histories.size());

                    return new PsPlusPricingResponse.PsPlusPriceHistoryDto(
                            h.getRecordedAt().toLocalDate(),
                            historyPrice,
                            discountRate,
                            verdict
                    );
                })
                .toList();
    }

    @Transactional
    public void upsertPsPlusPrices(PsPlusCollectRequest request) {
        if (request.getData() == null || request.getData().isEmpty()) {
            log.warn("수집된 PS Plus 데이터가 없습니다.");
            return;
        }

        // 1번의 SELECT로 모든 티어 정보 조회 후 Map으로 변환
        Map<PsPlusTier, PsPlusPricing> existingMap = psPlusPricingRepository.findAll()
                .stream()
                .collect(Collectors.toMap(PsPlusPricing::getTier, p -> p));

        request.getData().forEach((tier, prices) -> upsertTierPrice(tier, prices, existingMap));
    }

    private void upsertTierPrice(PsPlusTier tier, PsPlusCollectRequest.TierPriceReq prices,
                                  Map<PsPlusTier, PsPlusPricing> existingMap) {
        Integer price1Month = prices.getPrice1Month();
        Integer price3Month = prices.getPrice3Month();
        Integer price12Month = prices.getPrice12Month();

        Optional.ofNullable(existingMap.get(tier)).ifPresentOrElse(
                current -> updateIfChanged(current, tier, price1Month, price3Month, price12Month),
                () -> insertNew(tier, price1Month, price3Month, price12Month)
        );
    }

    private void updateIfChanged(PsPlusPricing current, PsPlusTier tier,
                                  Integer price1Month, Integer price3Month, Integer price12Month) {
        if (current.isSamePrice(price1Month, price3Month, price12Month)) {
            log.debug("PS Plus [{}] 가격 변동 없음. (Skip)", tier.name());
            return;
        }
        log.debug("PS Plus [{}] 가격 변동 감지! (12M: {} -> {})", tier.name(), current.getPrice12Month(), price12Month);
        current.updatePrices(price1Month, price3Month, price12Month);
        saveHistory(tier, price1Month, price3Month, price12Month);
    }

    private void insertNew(PsPlusTier tier, Integer price1Month, Integer price3Month, Integer price12Month) {
        log.debug("PS Plus [{}] 최초 데이터 적재 완료", tier.name());
        psPlusPricingRepository.save(PsPlusPricing.create(tier, price1Month, price3Month, price12Month));
        saveHistory(tier, price1Month, price3Month, price12Month);
    }

    private void saveHistory(PsPlusTier tier, Integer price1Month, Integer price3Month, Integer price12Month) {
        psPlusHistoryRepository.save(PsPlusHistory.create(tier, price1Month, price3Month, price12Month));
    }
}
