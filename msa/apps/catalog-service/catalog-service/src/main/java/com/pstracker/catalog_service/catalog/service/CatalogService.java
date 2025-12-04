package com.pstracker.catalog_service.catalog.service;

import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.domain.GamePriceHistory;
import com.pstracker.catalog_service.catalog.dto.CollectRequestDto;
import com.pstracker.catalog_service.catalog.event.GamePriceChangedEvent;
import com.pstracker.catalog_service.catalog.repository.GamePriceHistoryRepository;
import com.pstracker.catalog_service.catalog.repository.GameRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CatalogService {

    private final GameRepository gameRepository;
    private final GamePriceHistoryRepository priceHistoryRepository;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * 크롤러가 수집한 데이터를 저장/갱신하는 핵심 로직
     * 원칙: "가격 정보는 변동이 있을 때만 INSERT 한다."
     */
    @Transactional
    public void upsertGameData(CollectRequestDto request) {
        // 1. 게임 정보 찾기 (없으면 생성)
        Game game = gameRepository.findByPsStoreId(request.getPsStoreId())
                .orElseGet(() -> {
                    log.info("✨ New Game Discovered: {}", request.getTitle());
                    return gameRepository.save(Game.create(
                            request.getPsStoreId(), request.getTitle(), request.getPublisher(),
                            request.getImageUrl(), request.getDescription()
                    ));
                });

        // 2. 게임 메타 정보 업데이트 (항상 최신화)
        // 가격이 안 변했어도, '마지막 확인 시간(lastUpdated)'은 갱신되어야 수집 대상에서 제외됨
        game.updateInfo(
                request.getTitle(), request.getPublisher(), request.getImageUrl(),
                request.getDescription(), request.getGenreIds()
        );

        // 3. [Core] 가격 변동 검사 및 이력 저장
        // 가장 최근의 가격 이력을 가져옵니다.
        Optional<GamePriceHistory> latestHistoryOpt = priceHistoryRepository.findTopByGameOrderByRecordedAtDesc(game);

        if (shouldSaveHistory(latestHistoryOpt, request)) {
            // 3-1. 변동이 감지되었으므로 저장
            GamePriceHistory history = GamePriceHistory.create(
                    game, request.getOriginalPrice(), request.getCurrentPrice(),
                    request.getDiscountRate(), request.isPlusExclusive(), request.getSaleEndDate()
            );
            priceHistoryRepository.save(history);
            log.info("📈 Price Changed & Saved: {} ({} KRW)", game.getName(), request.getCurrentPrice());

            // 3-2. 가격 하락 알림 체크 (저장이 일어난 경우에만 체크하면 됨)
            checkAndPublishAlert(game, latestHistoryOpt, request.getCurrentPrice(), request.getDiscountRate());
        } else {
            // 변동 없음: 로그만 남기고 INSERT 생략 (데이터 다이어트 성공!)
            log.debug("👌 No Change: {} (Skipping DB Insert)", game.getName());
        }
    }

    /**
     * 가격 이력을 저장해야 하는지 판단합니다.
     * 1. 이력이 아예 없거나 (신규)
     * 2. 가격/할인조건이 변경된 경우
     */
    private boolean shouldSaveHistory(Optional<GamePriceHistory> latestHistoryOpt, CollectRequestDto request) {
        return latestHistoryOpt.map(gamePriceHistory -> !gamePriceHistory.isSameCondition(
                request.getCurrentPrice(), request.getDiscountRate(),
                request.isPlusExclusive(), request.getSaleEndDate()
        )).orElse(true);
    }

    /**
     * 알림 발행 로직 분리 (Clean Code)
     */
    private void checkAndPublishAlert(Game game, Optional<GamePriceHistory> oldHistoryOpt, int newPrice, int newDiscountRate) {
        // 이전 기록이 없으면 알림 대상 아님 (신규 게임)
        if (oldHistoryOpt.isEmpty()) return;

        Integer oldPrice = oldHistoryOpt.get().getPrice();

        // 가격이 떨어졌을 때만 알림
        if (newPrice < oldPrice) {
            log.info("🚨 Price Drop Detected! {} ({} -> {})", game.getName(), oldPrice, newPrice);
            eventPublisher.publishEvent(new GamePriceChangedEvent(
                    game.getName(), game.getPsStoreId(), oldPrice, newPrice, newDiscountRate, game.getImageUrl()
            ));
        }
    }

    /**
     * 수집기에게 "지금 갱신해야 할 게임들"의 목록(Target URLs)을 반환합니다.
     * 정책:
     * 1. 3일 이상 업데이트 안 된 게임
     * 2. (쿼리상) 할인 종료일이 지난 게임
     */
    public List<String> getGamesToUpdate() {
        // 1. 기준 설정: 하루 전
        LocalDateTime oneDayAgo = LocalDateTime.now().minusDays(1);

        // 2. Repository에 쿼리 요청
        List<Game> targets = gameRepository.findGamesToUpdate(oneDayAgo);

        return targets.stream()
                .limit(100) // 배치 1회당 10개 제한 (조절 가능)
                .map(game -> "https://store.playstation.com/ko-kr/product/" + game.getPsStoreId())
                .toList();
    }
}
