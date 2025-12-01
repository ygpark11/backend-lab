package com.pstracker.catalog_service.catalog.service;

import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.domain.GamePriceHistory;
import com.pstracker.catalog_service.catalog.dto.CollectRequestDto;
import com.pstracker.catalog_service.catalog.repository.GamePriceHistoryRepository;
import com.pstracker.catalog_service.catalog.repository.GameRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CatalogService {

    private final GameRepository gameRepository;
    private final GamePriceHistoryRepository priceHistoryRepository;

    /**
     * 크롤러가 수집한 데이터를 저장/갱신하는 핵심 로직
     */
    @Transactional
    public void upsertGameData(CollectRequestDto request) {
        // 1. 게임 정보 찾기 (없으면 새로 생성)
        Game game = gameRepository.findByPsStoreId(request.getPsStoreId())
                .orElseGet(() -> {
                    // 없으면 신규 생성 (Factory Method 사용)
                    log.info("✨ New Game Found: {}", request.getTitle());
                    Game newGame = Game.create(
                            request.getPsStoreId(),
                            request.getTitle(),
                            request.getPublisher(),
                            request.getImageUrl(),
                            request.getDescription()
                    );
                    return gameRepository.save(newGame);
                });

        // 2. 게임 정보 업데이트 (기존 데이터가 있어도 최신 정보로 덮어쓰기)
        game.updateInfo(
                request.getTitle(),
                request.getPublisher(),
                request.getImageUrl(),
                request.getDescription(),
                request.getGenreIds() // [New] 장르 정보 반영
        );

        // 3. 가격 이력 기록 (무조건 Insert)
        // 과거 가격을 덮어쓰는게 아니라, 오늘의 가격을 '한 줄 추가' 하는 것임.
        GamePriceHistory history = GamePriceHistory.create(
                game,
                request.getOriginalPrice(), // [New] 정가
                request.getCurrentPrice(),
                request.getDiscountRate(),
                request.isPlusExclusive(),  // [New] Plus 전용 여부
                request.getSaleEndDate()    // [New] 할인 종료일
        );

        priceHistoryRepository.save(history);

        log.debug("📝 Price updated: {} -> {} KRW (Discount: {}%)",
                game.getName(), request.getCurrentPrice(), request.getDiscountRate());
    }
}
