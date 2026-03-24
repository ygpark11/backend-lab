package com.pstracker.catalog_service.catalog.service;

import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.dto.RankingUpdateRequestDto;
import com.pstracker.catalog_service.catalog.repository.GameRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RankingService {

    private final GameRepository gameRepository;

    @Transactional
    public void updateRankings(RankingUpdateRequestDto request) {
        String type = request.getRankingType();
        List<String> psStoreIds = request.getPsStoreIds();

        log.info("🏆 [Ranking Update] Type: {}, Target Count: {}", type, psStoreIds.size());

        // 1. 기존 랭킹 NULL 로 초기화 (UPDATE 1방)
        if ("BEST_SELLER".equals(type)) {
            gameRepository.clearBestSellerRanks();
        } else if ("MOST_DOWNLOADED".equals(type)) {
            gameRepository.clearMostDownloadedRanks();
        } else {
            log.error("알 수 없는 랭킹 타입입니다: {}", type);
            return;
        }

        List<Game> targetGames = new ArrayList<>();
        int chunkSize = 100;
        for (int i = 0; i < psStoreIds.size(); i += chunkSize) {
            List<String> chunk = psStoreIds.subList(i, Math.min(psStoreIds.size(), i + chunkSize));
            targetGames.addAll(gameRepository.findByPsStoreIdIn(chunk));
        }

        Map<String, Game> gameMap = targetGames.stream()
                .collect(Collectors.toMap(Game::getPsStoreId, game -> game));

        int successCount = 0;
        for (int i = 0; i < psStoreIds.size(); i++) {
            String psStoreId = psStoreIds.get(i);
            int currentRank = i + 1;

            Game game = gameMap.get(psStoreId);

            if (game != null) {
                game.updateRank(type, currentRank);
                successCount++;
            } else {
                log.debug("DB 미존재 게임 스킵 (PS_STORE_ID: {})", psStoreId);
            }
        }

        log.info("[Ranking Update] 완료! 총 {}개 중 {}개 매칭 및 랭킹 부여 성공.", psStoreIds.size(), successCount);
    }
}