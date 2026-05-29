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
     * 따라서 discountRate > 0인 레코드 = 정가→할인 전환(또는 첫 수집 시 할인 중),
     * discountRate = 0인 레코드 = 할인→정가 복귀를 의미합니다.
     *
     * <p>이 메서드는 프론트엔드가 이미 표시하는 정보(현재 할인율·원화 가격, 최저가 원화,
     * 세일 종료일, PS Plus 뱃지, inCatalog 배너, PriceVerdict)를 중복 출력하지 않습니다.
     * 추적 기간·할인 횟수·빈도·역대 최대 할인율(%)·현재 vs 역사 비교 등
     * 다른 곳에서 제공하지 않는 패턴 분석 정보에 집중합니다.
     *
     * @param originalPrice   정가 (MSRP)
     * @param currentPrice    현재 수집된 가격 (할인 여부 판단용)
     * @param lowestPrice     역대 최저가 (null 또는 0이면 history에서 재계산)
     * @param isPlusExclusive 현재 할인이 PS Plus 전용인지 여부
     * @param releaseDate     공식 출시일
     * @param history         수집된 가격 이력 (가격 변동 이벤트 기반)
     * @return [등급명, 분석 메시지]
     */
    public String[] calculateDefenseTier(
            Integer originalPrice,
            Integer currentPrice,
            Integer lowestPrice,
            boolean isPlusExclusive,
            LocalDate releaseDate,
            List<GameDetailResponse.PriceHistoryDto> history) {

        if (originalPrice == null || originalPrice == 0 || history == null || history.isEmpty()) {
            return new String[]{"등급 외", "가격 정보가 없습니다."};
        }

        // ─────────────────────────────────────────────────────────
        // 핵심 신호 계산
        // ─────────────────────────────────────────────────────────

        // 역대 최저가: 전달받은 lowestPrice 우선, 유효하지 않으면 history에서 재계산
        // (lowestPrice가 null·0·정가 이상이면 무효)
        int safeLowest = (lowestPrice != null && lowestPrice > 0 && lowestPrice < originalPrice)
                ? lowestPrice
                : history.stream()
                        .filter(h -> h.price() != null && h.price() > 0)
                        .mapToInt(GameDetailResponse.PriceHistoryDto::price)
                        .min()
                        .orElse(originalPrice);

        boolean hasValidLowest = safeLowest < originalPrice;

        // 현재 할인 상태
        boolean isOnSale = currentPrice != null && currentPrice < originalPrice;
        int curRate = isOnSale
                ? (int) Math.round((double) (originalPrice - currentPrice) / originalPrice * 100) : 0;

        // 현재 가격이 역대 최저가 구간인지 (유효한 lowestPrice가 있을 때만)
        boolean isAtHistoricLow = isOnSale && hasValidLowest && currentPrice <= safeLowest;

        // 역대 최대 할인율 (역대 최저가 기준 %)
        double maxRate = hasValidLowest
                ? (double) (originalPrice - safeLowest) / originalPrice * 100 : 0;

        // 출시 후 경과 개월 수
        long monthsSinceRelease = releaseDate != null
                ? ChronoUnit.MONTHS.between(releaseDate, LocalDate.now()) : 99L;

        // 우리 시스템의 실제 추적 시작일 & 추적 개월 수
        LocalDate trackingStart = history.stream()
                .map(GameDetailResponse.PriceHistoryDto::date)
                .min(LocalDate::compareTo)
                .orElse(LocalDate.now());
        long tracked = Math.max(1, ChronoUnit.MONTHS.between(trackingStart, LocalDate.now()));

        // 첫 수집 당시 이미 할인가였는지 감지 (콜드 스타트 왜곡 방지)
        // 이벤트 기반 이력에서 첫 레코드의 discountRate > 0 이면
        // 해당 세일이 수집 이전부터 진행 중이었을 가능성이 있음
        boolean firstWasDiscounted = history.get(0).discountRate() != null
                && history.get(0).discountRate() > 0;

        // 할인 이력 건수: discountRate > 0인 레코드 = 할인 상태로의 전환 횟수
        int discountCount = (int) history.stream()
                .filter(h -> h.discountRate() != null && h.discountRate() > 0)
                .count();

        // 빈도 계산용 할인 횟수: 첫 수집이 할인가면 해당 건은
        // "수집 이전부터 진행된 세일"일 수 있으므로 보수적으로 1건 제외
        int countForFreq = firstWasDiscounted ? Math.max(1, discountCount - 1) : discountCount;
        double monthsPerDiscount = discountCount > 0
                ? (double) tracked / countForFreq : Double.MAX_VALUE;

        // ─────────────────────────────────────────────────────────
        // Layer 1: 신작 구간 (출시 6개월 미만)
        // ─────────────────────────────────────────────────────────
        if (monthsSinceRelease < 6) {
            // 할인 이력 전무 + 현재 정가
            if (!isOnSale && discountCount == 0) {
                return new String[]{"N급 신작",
                        String.format("출시 %d개월차. 아직 할인 신호가 잡힌 적 없습니다.", monthsSinceRelease)};
            }
            // 신작인데 현재 할인 중 (이벤트 기반: 정가→할인 전환 발생)
            if (isOnSale) {
                String plusNote = isPlusExclusive ? " (PS Plus 전용)" : "";
                if (discountCount >= 2) {
                    return new String[]{"신작 재할인",
                            String.format("출시 %d개월차. %d번째 할인 중 (%d%%%s). 패턴 형성 중입니다.",
                                    monthsSinceRelease, discountCount, curRate, plusNote)};
                }
                return new String[]{"신작 첫 할인",
                        String.format("출시 %d개월만에 %d%%%s 첫 신호 포착. 향후 패턴은 미지수입니다.",
                                monthsSinceRelease, curRate, plusNote)};
            }
            // 신작인데 과거 할인 이력은 있고, 현재는 정가로 복귀
            return new String[]{"N급 신작",
                    String.format("출시 %d개월차. %d번 할인 후 현재 정가.", monthsSinceRelease, discountCount)};
        }

        // ─────────────────────────────────────────────────────────
        // Layer 2: 데이터 부족 → 패턴 판단 불가
        // ─────────────────────────────────────────────────────────
        if (tracked < 3) {
            // 케이스 A: 할인 이력 자체가 없음
            if (discountCount == 0) {
                return new String[]{"관측 중",
                        "패턴 분석까지 조금 더 기다려주세요!"};
            }
            // 케이스 B: 첫 수집이 할인가이고 이후 새로운 할인 전환이 없음
            // → 수집 이전부터 진행 중인 세일 1건만 존재, 패턴 불명
            if (firstWasDiscounted && discountCount == 1) {
                return new String[]{"관측 중",
                        String.format("수집 시작(%d.%02d)부터 추적 중. 정가 이력이 쌓이면 분석합니다.",
                                trackingStart.getYear(), trackingStart.getMonthValue())};
            }
        }

        // ─────────────────────────────────────────────────────────
        // Layer 3: S급 철벽 (추적 기간 내 할인 발생 없음)
        // ─────────────────────────────────────────────────────────
        if (discountCount == 0) {
            return new String[]{"S급 철벽",
                    String.format("%d개월 동안 할인 신호가 단 한 번도 잡히지 않았습니다.", tracked)};
        }

        // ─────────────────────────────────────────────────────────
        // Layer 4: 방어도 평가 (할인 이력 보유)
        // 메시지 구조: [역사 패턴 요약]. [현재 상태 맥락 해석].[콜드 스타트 주의]
        // 역사 요약을 앞에 배치 (모바일 truncate 환경 고려)
        // ─────────────────────────────────────────────────────────

        // 할인 이력은 있으나 유효한 최저가를 산출할 수 없는 경우 (데이터 품질 이상)
        if (!hasValidLowest) {
            return new String[]{"분석 불가", "가격 이력 데이터가 유효하지 않습니다."};
        }

        String freqText = buildFreqText(monthsPerDiscount);

        // 현재 상태를 역사 기준으로 해석 (프론트에서 이미 표시하는 수치 단순 반복 지양)
        String currentStateText = buildCurrentStateText(
                isOnSale, isAtHistoricLow, isPlusExclusive, curRate, maxRate,
                currentPrice, safeLowest, originalPrice);

        // 첫 수집이 할인가였을 때만 경고 추가
        String coldStartNote = firstWasDiscounted
                ? String.format(" ※ %d.%02d 수집 당시 이미 할인 중 — 이전 이력 미반영.",
                        trackingStart.getYear(), trackingStart.getMonthValue())
                : "";

        String histSummary = String.format("%d개월 추적, %d번 할인, 역대 최대 %.0f%%. %s.",
                tracked, discountCount, maxRate, freqText);

        String message = histSummary + " " + currentStateText + coldStartNote;

        // 등급 분류: 역대 최대 할인율 기준
        if (maxRate <= 25.0) {
            return new String[]{"A급 방패", message};   // 최대 25% 이하: 소폭 할인
        } else if (maxRate <= 40.0) {
            return new String[]{"B급 일반", message};   // 26~40%: 일반 세일 구간
        } else if (maxRate < 60.0) {
            return new String[]{"C급 솜방패", message}; // 41~59%: 반값 근처
        } else {
            return new String[]{"D급 낙하산", message}; // 60% 이상: 대폭 할인
        }
    }

    /**
     * 할인 빈도를 자연어로 표현합니다.
     * monthsPerDiscount = 추적 기간 / 확인된 할인 횟수 (보수적 보정 적용)
     */
    private String buildFreqText(double monthsPerDiscount) {
        if (monthsPerDiscount >= 12) return "할인이 드뭅니다 (연 1회 미만)";
        if (monthsPerDiscount >= 2)  return String.format("약 %.0f개월에 1회 꼴", monthsPerDiscount);
        return "자주 세일하는 편 (2개월 이내 1회)";
    }

    /**
     * 현재 상태를 역사 패턴 맥락에서 해석합니다.
     * 프론트에서 이미 표시하는 원화 수치·할인율·세일 종료일을 단순 반복하지 않고
     * 역대 기록 대비 현재 위치(갭·역대 최저 여부)에 집중합니다.
     */
    private String buildCurrentStateText(
            boolean isOnSale, boolean isAtHistoricLow, boolean isPlusExclusive,
            int curRate, double maxRate,
            Integer currentPrice, int safeLowest, int originalPrice) {

        if (!isOnSale) {
            return "현재 정가입니다.";
        }

        String plusNote = isPlusExclusive ? " (PS Plus 전용)" : "";

        if (isAtHistoricLow) {
            return String.format("현재 %d%%%s 할인은 역대 최저가 구간입니다.", curRate, plusNote);
        }

        // 역대 최저(%)까지 몇 %p 여유가 있는지 → 더 기다릴 여지를 수치로 제시
        double gapPct = (double) (currentPrice - safeLowest) / originalPrice * 100;
        return String.format("현재 %d%%%s 할인 중. 역대 최저(%.0f%%)까지 %.0f%%p 여유가 있습니다.",
                curRate, plusNote, maxRate, gapPct);
    }
}
