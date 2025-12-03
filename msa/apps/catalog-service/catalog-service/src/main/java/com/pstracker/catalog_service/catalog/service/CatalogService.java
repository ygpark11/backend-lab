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
     */
    @Transactional
    public void upsertGameData(CollectRequestDto request) {
        // 1. 게임 정보 찾기 (이전 로직 동일)
        Game game = gameRepository.findByPsStoreId(request.getPsStoreId())
                .orElseGet(() -> {
                    log.info("✨ New Game Found: {}", request.getTitle());
                    return gameRepository.save(Game.create(
                            request.getPsStoreId(), request.getTitle(), request.getPublisher(),
                            request.getImageUrl(), request.getDescription()
                    ));
                });

        // [Logic Check] 가격 변동 확인을 위해 '직전 가격' 조회
        // 신규 게임 생성 직후라면 이력이 없으므로 Optional.empty() 반환됨
        Integer oldPrice = priceHistoryRepository.findTopByGameOrderByRecordedAtDesc(game)
                .map(GamePriceHistory::getPrice) // 가격만 추출
                .orElse(null); // 없으면 null

        // 2. 게임 정보 업데이트 (기존 데이터가 있어도 최신 정보로 덮어쓰기)
        game.updateInfo(
                request.getTitle(), request.getPublisher(), request.getImageUrl(),
                request.getDescription(), request.getGenreIds()
        );

        // 3. 가격 이력 기록 (무조건 Insert)
        // 과거 가격을 덮어쓰는게 아니라, 오늘의 가격을 '한 줄 추가' 하는 것임.
        GamePriceHistory history = GamePriceHistory.create(
                game, request.getOriginalPrice(), request.getCurrentPrice(),
                request.getDiscountRate(), request.isPlusExclusive(), request.getSaleEndDate()
        );
        priceHistoryRepository.save(history);

        log.debug("📝 Price updated: {} -> {} KRW", game.getName(), request.getCurrentPrice());

        //if (true) {
        //    log.info("🚨 [TEST] Forcing Event Publish for: {}", game.getName());

        // 4. [New] 알림 이벤트 발행 (The Watcher Trigger)
        // 조건: 이전 가격이 존재하고(신규 게임 X), 현재 가격이 이전 가격보다 쌀 때
        if (oldPrice != null && request.getCurrentPrice() < oldPrice) {
            log.info("🚨 Price Drop Detected! {} ({} -> {})", game.getName(), oldPrice, request.getCurrentPrice());

            eventPublisher.publishEvent(new GamePriceChangedEvent(
                    game.getName(),
                    game.getPsStoreId(),
                    oldPrice,
                    request.getCurrentPrice(),
                    request.getDiscountRate(),
                    game.getImageUrl()
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
        // 기준: 3일 전
        LocalDateTime threeDaysAgo = LocalDateTime.now().minusDays(3);
        LocalDate today = LocalDate.now();

        // 최대 10개씩만 갱신 (너무 많이 요청하면 차단 위험)
        // 실제로는 Pageable을 쓰는 게 좋지만, 지금은 List.stream().limit()으로 처리
        List<Game> targets = gameRepository.findGamesToUpdate(threeDaysAgo, today);

        return targets.stream()
                .limit(50) // 배치 1회당 10개 제한 (조절 가능)
                .map(game -> "https://store.playstation.com/ko-kr/product/" + game.getPsStoreId())
                .toList();
    }
}
