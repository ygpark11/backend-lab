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

    public String[] calculateDefenseTier(
            Integer originalPrice,
            Integer lowestPrice,
            LocalDate releaseDate,
            List<GameDetailResponse.PriceHistoryDto> history) {

        if (originalPrice == null || originalPrice == 0 || history == null || history.isEmpty()) {
            return new String[]{"등급 외", "가격 정보가 없습니다."};
        }

        // 1. 진짜 출시일 기준 개월 수 (신작 판별용)
        long monthsSinceRelease = (releaseDate != null) ? ChronoUnit.MONTHS.between(releaseDate, LocalDate.now()) : 99;

        // 2. 우리 시스템이 이 게임 가격을 추적한 실제 개월 수 (데이터 콜드 스타트 문제 해결)
        LocalDate trackingStartDate = history.stream()
                .map(GameDetailResponse.PriceHistoryDto::date)
                .min(LocalDate::compareTo)
                .orElse(LocalDate.now());

        long monthsSinceTracked = ChronoUnit.MONTHS.between(trackingStartDate, LocalDate.now());
        monthsSinceTracked = Math.max(1, monthsSinceTracked); // 최소 1개월로 보정 (0으로 나누기 방지)

        int discountCount = Math.max(0, history.size() - 1); // 첫 정가 등록(1) 제외한 실제 할인 횟수

        // 3. 신작 쉴드 (출시 6개월 미만인데 할인이 1번 이내인 경우) -> 진짜 출시일 기준!
        if (monthsSinceRelease < 6 && discountCount <= 1) {
            return new String[]{"N급 신작", "출시된 지 얼마 안 된 게임입니다. 당분간 큰 할인은 기대하기 어렵습니다."};
        }

        // 4. 정보 부족 방어 (추적 기간이 3개월 미만인데 할인 이력이 없는 경우)
        // 섣불리 "S급 철벽"이라고 단정 짓지 않고 "관측 중"으로 표시
        if (discountCount == 0 && monthsSinceTracked < 3) {
            return new String[]{"관측 중", "아직 데이터 수집 기간이 짧아 할인 성향을 파악 중입니다. 조금만 기다려주세요!"};
        }

        // 5. 할인 빈도(Frequency) 평가 (장기간 추적했는데도 할인이 없거나, 최저가가 정가랑 같을 때)
        if (discountCount == 0 || lowestPrice >= originalPrice) {
            return new String[]{"S급 철벽", "소니가 절대 깎아주지 않는 철벽 방어 중입니다."};
        }

        // 6. 역대 최대 할인율 계산
        double maxDiscountRate = lowestPrice > 0
                ? (double) (originalPrice - lowestPrice) / originalPrice * 100 : 0;

        // 7. 출시일이 아닌 '실제 추적 기간' 기준으로 할인 빈도 계산!
        double monthsPerDiscount = (double) monthsSinceTracked / discountCount;

        // A급: 20% 이하 (10~15% 수준의 짠돌이 할인)
        if (maxDiscountRate <= 20.0 && monthsPerDiscount > 3.0) {
            return new String[]{"A급 방패", "가끔 할인해도 10~20% 수준으로 찔끔 깎아줍니다. 무리한 반값 목표는 실패할 수 있습니다."};
        }
        // B급: 21~40% (일반적인 세일 구간)
        else if (maxDiscountRate <= 40.0) {
            return new String[]{"B급 일반", "무난한 타협점입니다. 30~40% 세일 구간을 노려볼 만합니다."};
        }
        // C급: 40% 초과 (거의 반값 이상 할인)
        else {
            return new String[]{"C급 솜방패", "툭하면 반값 근처로 후려치는 혜자 게임입니다. 여유롭게 최저가 라인을 설정하세요."};
        }
    }
}
