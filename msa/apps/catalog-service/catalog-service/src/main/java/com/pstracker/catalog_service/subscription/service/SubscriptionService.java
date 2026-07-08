package com.pstracker.catalog_service.subscription.service;

import com.pstracker.catalog_service.catalog.dto.GameIdMapping;
import com.pstracker.catalog_service.catalog.repository.GameRepository;
import com.pstracker.catalog_service.global.config.GlobalCacheConfig;
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
import com.pstracker.catalog_service.subscription.event.PsPlusDiscountEvent;
import com.pstracker.catalog_service.subscription.repository.PsPlusHistoryRepository;
import com.pstracker.catalog_service.subscription.repository.PsPlusMonthlyHistoryRepository;
import com.pstracker.catalog_service.subscription.repository.PsPlusPricingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;
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
    private final ApplicationEventPublisher eventPublisher;
    private final CacheManager cacheManager;

    @Cacheable(cacheNames = GlobalCacheConfig.PS_PLUS_PRICING_CACHE, key = "'pricing'")
    public PsPlusPricingResponse getLatestPricing() {
        List<PsPlusPricing> pricing = psPlusPricingRepository.findAll();

        if (pricing.isEmpty()) {
            return null;
        }

        Map<PsPlusTier, PsPlusPricingResponse.TierPriceDto> pricingData = pricing.stream()
                .collect(Collectors.toMap(
                        PsPlusPricing::getTier,
                        p -> {
                            Integer orig1M = p.resolvedOriginalPrice1Month();
                            Integer orig3M = p.resolvedOriginalPrice3Month();
                            Integer orig12M = p.resolvedOriginalPrice12Month();
                            // 정가와 현재 판매가가 다를 때만 할인가/할인율/종료일 노출 (프로모션 중)
                            boolean promo1M = !p.getPrice1Month().equals(orig1M);
                            boolean promo3M = !p.getPrice3Month().equals(orig3M);
                            boolean promo12M = !p.getPrice12Month().equals(orig12M);
                            return new PsPlusPricingResponse.TierPriceDto(
                                    orig1M, orig3M, orig12M,
                                    promo1M ? p.getPrice1Month() : null,
                                    promo3M ? p.getPrice3Month() : null,
                                    promo12M ? p.getPrice12Month() : null,
                                    promo1M ? calcDiscountRate(orig1M, p.getPrice1Month()) : 0,
                                    promo3M ? calcDiscountRate(orig3M, p.getPrice3Month()) : 0,
                                    promo12M ? calcDiscountRate(orig12M, p.getPrice12Month()) : 0,
                                    promo1M ? p.getSaleEndDate1Month() : null,
                                    promo3M ? p.getSaleEndDate3Month() : null,
                                    promo12M ? p.getSaleEndDate12Month() : null
                            );
                        }
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
                                    "price1Month", buildHistoryForDuration(tierHistories,
                                            PsPlusHistory::getPrice1Month, PsPlusHistory::resolvedOriginalPrice1Month,
                                            p.resolvedOriginalPrice1Month()),
                                    "price3Month", buildHistoryForDuration(tierHistories,
                                            PsPlusHistory::getPrice3Month, PsPlusHistory::resolvedOriginalPrice3Month,
                                            p.resolvedOriginalPrice3Month()),
                                    "price12Month", buildHistoryForDuration(tierHistories,
                                            PsPlusHistory::getPrice12Month, PsPlusHistory::resolvedOriginalPrice12Month,
                                            p.resolvedOriginalPrice12Month())
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

    private static int calcDiscountRate(int originalPrice, int price) {
        if (originalPrice <= 0 || price >= originalPrice) return 0;
        return (int) Math.round((double) (originalPrice - price) / originalPrice * 100);
    }

    private List<PsPlusPricingResponse.PsPlusPriceHistoryDto> buildHistoryForDuration(
            List<PsPlusHistory> histories,
            ToIntFunction<PsPlusHistory> priceExtractor,
            ToIntFunction<PsPlusHistory> originalPriceExtractor,
            Integer currentOriginalPrice) {

        Integer lowestPrice = histories.stream()
                .mapToInt(priceExtractor)
                .boxed()
                .min(Integer::compareTo)
                .orElse(currentOriginalPrice);

        return histories.stream()
                .map(h -> {
                    int historyPrice = priceExtractor.applyAsInt(h);
                    int historyOriginalPrice = originalPriceExtractor.applyAsInt(h);
                    int discountRate = calcDiscountRate(historyOriginalPrice, historyPrice);

                    PriceVerdict verdict = PriceVerdictCalculator.forSubscription(
                            historyPrice, historyOriginalPrice, lowestPrice, histories.size());

                    return new PsPlusPricingResponse.PsPlusPriceHistoryDto(
                            h.getCreatedAt().toLocalDate(),
                            historyPrice,
                            discountRate,
                            verdict
                    );
                })
                .toList();
    }

    public void refreshPsPlusPricingCache() {
        var cache = cacheManager.getCache(GlobalCacheConfig.PS_PLUS_PRICING_CACHE);
        if (cache != null) {
            cache.clear();
            log.info("PS Plus 가격 로컬 캐시(Caffeine) 전체 초기화 완료.");
        }
    }

    @Transactional
    @CacheEvict(cacheNames = GlobalCacheConfig.PS_PLUS_PRICING_CACHE, allEntries = true)
    public void upsertPsPlusPrices(PsPlusCollectRequest request) {
        if (request.getData() == null || request.getData().isEmpty()) {
            log.warn("수집된 PS Plus 데이터가 없습니다.");
            return;
        }

        // 1번의 SELECT로 모든 티어 정보 조회 후 Map으로 변환
        Map<PsPlusTier, PsPlusPricing> existingMap = psPlusPricingRepository.findAll()
                .stream()
                .collect(Collectors.toMap(PsPlusPricing::getTier, p -> p));

        AtomicBoolean discountStarted = new AtomicBoolean(false);
        request.getData().forEach((tier, prices) -> {
            if (upsertTierPrice(tier, prices, existingMap)) {
                discountStarted.set(true);
            }
        });

        // 어느 하나의 티어라도 정가→할인 전환이 감지되면 이벤트 발행 (트랜잭션 커밋 후 FCM 발송)
        if (discountStarted.get()) {
            eventPublisher.publishEvent(new PsPlusDiscountEvent());
        }
    }

    /**
     * @return true: 정가→할인 전환 감지 (FCM 이벤트 발행 대상)
     */
    private boolean upsertTierPrice(PsPlusTier tier, PsPlusCollectRequest.TierPriceReq prices,
                                    Map<PsPlusTier, PsPlusPricing> existingMap) {
        Integer price1Month = prices.getPrice1Month();
        Integer price3Month = prices.getPrice3Month();
        Integer price12Month = prices.getPrice12Month();
        Integer originalPrice1Month = prices.resolvedOriginalPrice1Month();
        Integer originalPrice3Month = prices.resolvedOriginalPrice3Month();
        Integer originalPrice12Month = prices.resolvedOriginalPrice12Month();
        LocalDate saleEndDate1Month = prices.getSaleEndDate1Month();
        LocalDate saleEndDate3Month = prices.getSaleEndDate3Month();
        LocalDate saleEndDate12Month = prices.getSaleEndDate12Month();

        return Optional.ofNullable(existingMap.get(tier))
                .map(current -> updateIfChanged(current, tier,
                        price1Month, price3Month, price12Month,
                        originalPrice1Month, originalPrice3Month, originalPrice12Month,
                        saleEndDate1Month, saleEndDate3Month, saleEndDate12Month))
                .orElseGet(() -> {
                    insertNew(tier,
                            price1Month, price3Month, price12Month,
                            originalPrice1Month, originalPrice3Month, originalPrice12Month,
                            saleEndDate1Month, saleEndDate3Month, saleEndDate12Month);
                    return false; // 최초 적재는 알림 미발송
                });
    }

    /**
     * @return true: 변동 후 할인 상태 (FCM 발송 대상)
     */
    private boolean updateIfChanged(PsPlusPricing current, PsPlusTier tier,
                                    Integer price1Month, Integer price3Month, Integer price12Month,
                                    Integer originalPrice1Month, Integer originalPrice3Month, Integer originalPrice12Month,
                                    LocalDate saleEndDate1Month, LocalDate saleEndDate3Month, LocalDate saleEndDate12Month) {
        if (current.isSamePrice(price1Month, price3Month, price12Month,
                originalPrice1Month, originalPrice3Month, originalPrice12Month,
                saleEndDate1Month, saleEndDate3Month, saleEndDate12Month)) {
            log.debug("PS Plus [{}] 가격 변동 없음. (Skip)", tier.name());
            return false;
        }

        log.debug("PS Plus [{}] 가격 변동 감지! (12M: {} -> {})", tier.name(), current.getPrice12Month(), price12Month);
        current.updatePrices(price1Month, price3Month, price12Month,
                originalPrice1Month, originalPrice3Month, originalPrice12Month,
                saleEndDate1Month, saleEndDate3Month, saleEndDate12Month);
        saveHistory(tier, price1Month, price3Month, price12Month,
                originalPrice1Month, originalPrice3Month, originalPrice12Month,
                saleEndDate1Month, saleEndDate3Month, saleEndDate12Month);

        // isSamePrice를 통과했으므로 변동 확정 → 새 가격이 할인이면 알림 발송
        return price1Month < originalPrice1Month
                || price3Month < originalPrice3Month
                || price12Month < originalPrice12Month;
    }

    private void insertNew(PsPlusTier tier,
                           Integer price1Month, Integer price3Month, Integer price12Month,
                           Integer originalPrice1Month, Integer originalPrice3Month, Integer originalPrice12Month,
                           LocalDate saleEndDate1Month, LocalDate saleEndDate3Month, LocalDate saleEndDate12Month) {
        log.debug("PS Plus [{}] 최초 데이터 적재 완료", tier.name());
        psPlusPricingRepository.save(PsPlusPricing.create(tier,
                price1Month, price3Month, price12Month,
                originalPrice1Month, originalPrice3Month, originalPrice12Month,
                saleEndDate1Month, saleEndDate3Month, saleEndDate12Month));
        saveHistory(tier, price1Month, price3Month, price12Month,
                originalPrice1Month, originalPrice3Month, originalPrice12Month,
                saleEndDate1Month, saleEndDate3Month, saleEndDate12Month);
    }

    private void saveHistory(PsPlusTier tier,
                             Integer price1Month, Integer price3Month, Integer price12Month,
                             Integer originalPrice1Month, Integer originalPrice3Month, Integer originalPrice12Month,
                             LocalDate saleEndDate1Month, LocalDate saleEndDate3Month, LocalDate saleEndDate12Month) {
        psPlusHistoryRepository.save(PsPlusHistory.create(tier,
                price1Month, price3Month, price12Month,
                originalPrice1Month, originalPrice3Month, originalPrice12Month,
                saleEndDate1Month, saleEndDate3Month, saleEndDate12Month));
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
                        GameIdMapping::psStoreId,
                        GameIdMapping::gameId
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
