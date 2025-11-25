package com.pstracker.catalog_service.catalog.service;

import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.dto.GameCollectRequest;
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

    @Transactional
    public Long saveOrUpdateGame(GameCollectRequest request) {
        // 1. 이미 저장된 게임인지 확인
        return gameRepository.findByPsStoreId(request.psStoreId())
                .map(existingGame -> {
                    // 2-A. 있다면? -> 가격 정보만 최신화 (Dirty Checking)
                    existingGame.updatePriceInfo(
                            request.currentPrice(),
                            request.isDiscount(),
                            request.discountRate()
                    );
                    log.info("게임 가격 정보 갱신: {} ({}원)", request.title(), request.currentPrice());
                    return existingGame.getId();
                })
                .orElseGet(() -> {
                    // 2-B. 없다면? -> 새로 생성 및 저장
                    Game newGame = Game.create(
                            request.psStoreId(),
                            request.title(),
                            request.publisher(),
                            request.imageUrl()
                    );
                    // 초기 가격 세팅
                    newGame.updatePriceInfo(
                            request.currentPrice(),
                            request.isDiscount(),
                            request.discountRate()
                    );
                    Game savedGame = gameRepository.save(newGame);
                    log.info("신규 게임 등록: {}", request.title());
                    return savedGame.getId();
                });
    }
}
