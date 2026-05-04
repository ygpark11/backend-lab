package com.pstracker.catalog_service.subscription.service;

import com.pstracker.catalog_service.subscription.domain.PsPlusHistory;
import com.pstracker.catalog_service.subscription.domain.PsPlusPricing;
import com.pstracker.catalog_service.subscription.domain.PsPlusTier;
import com.pstracker.catalog_service.subscription.dto.PsPlusCollectRequest;
import com.pstracker.catalog_service.subscription.repository.PsPlusHistoryRepository;
import com.pstracker.catalog_service.subscription.repository.PsPlusPricingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SubscriptionService {

    private final PsPlusPricingRepository pricingRepository;
    private final PsPlusHistoryRepository historyRepository;

    @Transactional
    public void upsertPsPlusPrices(PsPlusCollectRequest request) {
        if (request.getData() == null || request.getData().isEmpty()) {
            log.warn("수집된 PS Plus 데이터가 없습니다.");
            return;
        }

        // 1번의 SELECT로 모든 티어 정보 조회 후 Map으로 변환
        Map<PsPlusTier, PsPlusPricing> existingMap = pricingRepository.findAll()
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
        pricingRepository.save(PsPlusPricing.create(tier, price1Month, price3Month, price12Month));
        saveHistory(tier, price1Month, price3Month, price12Month);
    }

    private void saveHistory(PsPlusTier tier, Integer price1Month, Integer price3Month, Integer price12Month) {
        historyRepository.save(PsPlusHistory.create(tier, price1Month, price3Month, price12Month));
    }
}
