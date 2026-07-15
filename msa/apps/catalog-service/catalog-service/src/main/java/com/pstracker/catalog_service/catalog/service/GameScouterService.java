package com.pstracker.catalog_service.catalog.service;

import com.pstracker.catalog_service.catalog.dto.GameDetailResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GameScouterService {

    /**
     * 게임의 할인 방어도를 분석합니다.
     *
     * <p>히스토리는 가격이 변동할 때만 레코드가 추가되는 이벤트 기반 구조입니다.
     * discountRate > 0인 레코드 = 정가→할인 전환(또는 첫 수집 시 할인 중),
     * discountRate = 0인 레코드 = 할인→정가 복귀를 의미합니다.
     *
     * @return DefenseInfo — 등급명 및 수치 데이터 (프론트가 조립해 표시)
     */
    public GameDetailResponse.DefenseInfo calculateDefenseTier(
            Integer originalPrice,
            Integer currentPrice,
            Integer lowestPrice,
            LocalDate releaseDate,
            List<GameDetailResponse.PriceHistoryDto> history) {

        if (originalPrice == null || originalPrice == 0 || history == null || history.isEmpty()) {
            return new GameDetailResponse.DefenseInfo("등급 외", 0, 0, null, null, null, false, null);
        }

        // ─────────────────────────────────────────────────────────
        // 핵심 신호 계산
        // ─────────────────────────────────────────────────────────

        int safeLowest = (lowestPrice != null && lowestPrice > 0 && lowestPrice < originalPrice)
                ? lowestPrice
                : history.stream()
                        .filter(h -> h.price() != null && h.price() > 0)
                        .mapToInt(GameDetailResponse.PriceHistoryDto::price)
                        .min()
                        .orElse(originalPrice);

        boolean hasValidLowest = safeLowest < originalPrice;

        boolean isOnSale = currentPrice != null && currentPrice < originalPrice;

        double maxRate = hasValidLowest
                ? (double) (originalPrice - safeLowest) / originalPrice * 100 : 0;

        long monthsSinceRelease = releaseDate != null
                ? ChronoUnit.MONTHS.between(releaseDate, LocalDate.now()) : 99L;

        LocalDate trackingStart = history.stream()
                .map(GameDetailResponse.PriceHistoryDto::date)
                .min(LocalDate::compareTo)
                .orElse(LocalDate.now());
        long tracked = Math.max(1, ChronoUnit.MONTHS.between(trackingStart, LocalDate.now()));

        boolean firstWasDiscounted = history.get(0).discountRate() != null
                && history.get(0).discountRate() > 0;

        int discountCount = (int) history.stream()
                .filter(h -> h.discountRate() != null && h.discountRate() > 0)
                .count();

        int countForFreq = firstWasDiscounted ? Math.max(1, discountCount - 1) : discountCount;
        double monthsPerDiscount = discountCount > 0
                ? (double) tracked / countForFreq : Double.MAX_VALUE;

        // ─────────────────────────────────────────────────────────
        // Layer 1: 신작 구간 (출시 6개월 미만)
        // ─────────────────────────────────────────────────────────
        if (monthsSinceRelease < 6) {
            if (!isOnSale && discountCount == 0) {
                return new GameDetailResponse.DefenseInfo(
                        "N급 신작", tracked, 0, null, null, null, firstWasDiscounted, trackingStart);
            }
            if (isOnSale) {
                if (discountCount >= 2) {
                    Integer mr = hasValidLowest ? (int) Math.round(maxRate) : null;
                    Double mps = countForFreq > 1 ? monthsPerDiscount : null;
                    return new GameDetailResponse.DefenseInfo(
                            "신작 재할인", tracked, discountCount, mr, mps,
                            computeNextSaleEstimate(history, monthsPerDiscount, countForFreq),
                            firstWasDiscounted, trackingStart);
                }
                boolean lateTracking = (monthsSinceRelease - tracked) >= 2;
                if (lateTracking) {
                    return new GameDetailResponse.DefenseInfo(
                            "신작 할인", tracked, discountCount, null, null, null, firstWasDiscounted, trackingStart);
                }
                return new GameDetailResponse.DefenseInfo(
                        "신작 첫 할인", tracked, discountCount, null, null, null, firstWasDiscounted, trackingStart);
            }
            // 과거 할인 이력 있음, 현재 정가
            return new GameDetailResponse.DefenseInfo(
                    "N급 신작", tracked, discountCount,
                    hasValidLowest ? (int) Math.round(maxRate) : null,
                    null, null, firstWasDiscounted, trackingStart);
        }

        // ─────────────────────────────────────────────────────────
        // Layer 2: 데이터 부족 → 패턴 판단 불가
        // ─────────────────────────────────────────────────────────
        if (tracked < 3) {
            if (discountCount == 0) {
                return new GameDetailResponse.DefenseInfo(
                        "관측 중", tracked, 0, null, null, null, false, trackingStart);
            }
            if (firstWasDiscounted && discountCount == 1) {
                return new GameDetailResponse.DefenseInfo(
                        "관측 중", tracked, discountCount, null, null, null, true, trackingStart);
            }
        }

        // ─────────────────────────────────────────────────────────
        // Layer 3: S급 철벽 (추적 기간 내 할인 발생 없음)
        // ─────────────────────────────────────────────────────────
        if (discountCount == 0) {
            return new GameDetailResponse.DefenseInfo(
                    "S급 철벽", tracked, 0, null, null, null, false, trackingStart);
        }

        // ─────────────────────────────────────────────────────────
        // Layer 4: 방어도 평가 (할인 이력 보유)
        // ─────────────────────────────────────────────────────────
        if (!hasValidLowest) {
            return new GameDetailResponse.DefenseInfo(
                    "분석 불가", tracked, discountCount, null, null, null, firstWasDiscounted, trackingStart);
        }

        int maxRateInt = (int) Math.round(maxRate);
        Double mps = countForFreq > 1 ? monthsPerDiscount : null;
        LocalDate nextSale = computeNextSaleEstimate(history, monthsPerDiscount, countForFreq);

        String tier;
        if (maxRate <= 25.0)      tier = "A급 방패";
        else if (maxRate <= 40.0) tier = "B급 일반";
        else if (maxRate < 60.0)  tier = "C급 솜방패";
        else                      tier = "D급 낙하산";

        return new GameDetailResponse.DefenseInfo(
                tier, tracked, discountCount, maxRateInt, mps, nextSale, firstWasDiscounted, trackingStart);
    }

    /**
     * 마지막 할인 시작일 + 평균 주기로 예상 다음 할인일을 계산합니다.
     * 할인이 1회 이하(패턴 없음)이면 null을 반환합니다.
     */
    private LocalDate computeNextSaleEstimate(
            List<GameDetailResponse.PriceHistoryDto> history,
            double monthsPerDiscount,
            int countForFreq) {
        if (countForFreq <= 1) return null;
        LocalDate lastSaleDate = history.stream()
                .filter(h -> h.discountRate() != null && h.discountRate() > 0)
                .map(GameDetailResponse.PriceHistoryDto::date)
                .max(LocalDate::compareTo)
                .orElse(null);
        if (lastSaleDate == null) return null;
        return lastSaleDate.plusMonths(Math.round(monthsPerDiscount));
    }
}
