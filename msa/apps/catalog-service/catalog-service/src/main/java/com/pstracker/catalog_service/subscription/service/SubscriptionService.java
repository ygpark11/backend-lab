package com.pstracker.catalog_service.subscription.service;

import com.pstracker.catalog_service.catalog.dto.GameIdMappingDto;
import com.pstracker.catalog_service.catalog.repository.GameRepository;
import com.pstracker.catalog_service.global.domain.PriceVerdict;
import com.pstracker.catalog_service.global.util.PriceVerdictCalculator;
import com.pstracker.catalog_service.scraping.domain.GameCandidate;
import com.pstracker.catalog_service.scraping.repository.GameCandidateRepository;
import com.pstracker.catalog_service.subscription.domain.PsPlusHistory;
import com.pstracker.catalog_service.subscription.domain.PsPlusMonthlyHistory;
import com.pstracker.catalog_service.subscription.domain.PsPlusPricing;
import com.pstracker.catalog_service.subscription.domain.PsPlusTier;
import com.pstracker.catalog_service.subscription.dto.MonthlyGameArchiveResponse;
import com.pstracker.catalog_service.subscription.dto.PsPlusBenefitCollectRequest;
import com.pstracker.catalog_service.subscription.dto.PsPlusCollectRequest;
import com.pstracker.catalog_service.subscription.dto.PsPlusPricingResponse;
import com.pstracker.catalog_service.subscription.repository.PsPlusHistoryRepository;
import com.pstracker.catalog_service.subscription.repository.PsPlusMonthlyHistoryRepository;
import com.pstracker.catalog_service.subscription.repository.PsPlusPricingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.YearMonth;
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
    private final PsPlusMonthlyHistoryRepository psPlusMonthlyHistoryRepository;
    private final GameRepository gameRepository;
    private final GameCandidateRepository gameCandidateRepository;


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

        List<PsPlusHistory> allHistories = psPlusHistoryRepository.findAllByOrderByCreatedAtAsc();
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
                            h.getCreatedAt().toLocalDate(),
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

    @Transactional
    public void collectPsPlusBenefits(PsPlusBenefitCollectRequest request) {
        String currentMonth = YearMonth.now().toString();

        // 수집된 데이터를 BenefitType(ESSENTIAL, CATALOG) 기준으로 분리
        Map<PsPlusMonthlyHistory.BenefitType, List<PsPlusBenefitCollectRequest.BenefitGameDto>> groupedGames =
                request.benefits().stream().collect(Collectors.groupingBy(PsPlusBenefitCollectRequest.BenefitGameDto::benefitType));

        // 타입별로 각각 독립적인 중복 검사 및 적재 로직 수행
        for (Map.Entry<PsPlusMonthlyHistory.BenefitType, List<PsPlusBenefitCollectRequest.BenefitGameDto>> entry : groupedGames.entrySet()) {
            PsPlusMonthlyHistory.BenefitType type = entry.getKey();
            List<PsPlusBenefitCollectRequest.BenefitGameDto> incomingGames = entry.getValue();

            List<String> incomingStoreIds = incomingGames.stream()
                    .map(PsPlusBenefitCollectRequest.BenefitGameDto::psStoreId)
                    .toList();

            // 해당 타입(ESSENTIAL or CATALOG)의 가장 최근 적재 이력 조회
            Optional<PsPlusMonthlyHistory> latestHistory = psPlusMonthlyHistoryRepository.findFirstByBenefitTypeOrderByTargetMonthDesc(type);

            if (latestHistory.isPresent()) {
                String latestSavedTargetMonth = latestHistory.get().getTargetMonth();
                List<String> latestSavedStoreIds = psPlusMonthlyHistoryRepository.findPsStoreIdsByTargetMonthAndBenefitType(latestSavedTargetMonth, type);

                // 현재 수집된 게임과 과거 게임 교집합(중복) 확인
                boolean hasIntersection = incomingStoreIds.stream().anyMatch(latestSavedStoreIds::contains);

                if (hasIntersection) {
                    log.debug("[{}] 최신 적재된 묶음과 동일한 데이터가 존재합니다. 갱신 무시 (기준 월: {})", type, latestSavedTargetMonth);
                    continue; // 교집합이 있으면 이 타입은 건너뛰고 다음 타입(ex. CATALOG) 진행
                }
            }

            log.info("[{}] 새로운 혜택 게임 교체 감지! 신규 적재 타겟 월: {}", type, currentMonth);

            // DB 적재 진행
            for (PsPlusBenefitCollectRequest.BenefitGameDto gameDto : incomingGames) {
                String psStoreId = gameDto.psStoreId();

                PsPlusMonthlyHistory history = PsPlusMonthlyHistory.createPsPlusMonthlyHistory(
                        currentMonth,
                        psStoreId,
                        type,
                        gameDto.title(),
                        gameDto.imageUrl()
                );
                psPlusMonthlyHistoryRepository.save(history);

                // 메인 DB에 없는 신규 게임이라면 Candidate 적재 (기존 로직 유지)
                if (!gameRepository.existsByPsStoreId(psStoreId) && !gameCandidateRepository.existsByPsStoreId(psStoreId)) {
                    gameCandidateRepository.save(
                            GameCandidate.builder()
                                    .psStoreId(psStoreId)
                                    .title(gameDto.title())
                                    .imageUrl(gameDto.imageUrl())
                                    .build()
                    );
                    log.info("새로운 게임 Candidate 적재 완료: {}", gameDto.title());
                }
            }
        }
    }

    public Page<MonthlyGameArchiveResponse> getMonthlyGamesArchive(PsPlusMonthlyHistory.BenefitType benefitType, Pageable pageable) {
        // 달(Month) 단위로 페이징 처리하여 조회
        Page<MonthlyGameArchiveResponse> page = psPlusMonthlyHistoryRepository.findMonthlyArchivePage(benefitType, pageable);

        if (page.isEmpty()) {
            return page;
        }

        // 메인 DB 매핑을 위한 psStoreId 추출
        List<String> psStoreIds = page.getContent().stream()
                .flatMap(response -> response.getGames().stream())
                .map(MonthlyGameArchiveResponse.ArchiveGameDto::getPsStoreId)
                .toList();

        // Game ID 가져오기
        Map<String, Long> gameIdMap = gameRepository.findGameIdsByPsStoreIds(psStoreIds).stream()
                .collect(Collectors.toMap(
                        GameIdMappingDto::psStoreId,
                        GameIdMappingDto::gameId
                ));

        // 기존 DTO에 gameId 매핑
        page.getContent().forEach(response -> {
            response.getGames().forEach(game -> {
                game.setGameId(gameIdMap.get(game.getPsStoreId()));
            });
        });

        return page;
    }
}
