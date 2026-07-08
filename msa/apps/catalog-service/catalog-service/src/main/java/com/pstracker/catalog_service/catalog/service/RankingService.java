package com.pstracker.catalog_service.catalog.service;

import com.pstracker.catalog_service.catalog.dto.RankingUpdateRequest;
import com.pstracker.catalog_service.catalog.repository.GameRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class RankingService {

    private final GameRepository gameRepository;

    /**
     * 랭킹 일괄 업데이트
     * - 엔티티를 메모리에 로드하지 않고 벌크 UPDATE로 처리하여 메모리·쿼리 수 최소화
     */
    @Transactional
    public void updateRankings(RankingUpdateRequest request) {
        String type = request.getRankingType();
        List<String> psStoreIds = request.getPsStoreIds();

        log.info("[Ranking Update] Type: {}, Target Count: {}", type, psStoreIds.size());

        // 1. 기존 랭킹 전체 초기화 (UPDATE 1방)
        switch (type) {
            case "BEST_SELLER"      -> gameRepository.clearBestSellerRanks();
            case "MOST_DOWNLOADED"  -> gameRepository.clearMostDownloadedRanks();
            default -> {
                log.error("알 수 없는 랭킹 타입입니다: {}", type);
                return;
            }
        }

        // 2. 순위별 벌크 UPDATE (엔티티 로딩 없이 psStoreId → rank 직접 업데이트)
        int successCount = 0;
        for (int i = 0; i < psStoreIds.size(); i++) {
            String psStoreId = psStoreIds.get(i);
            int rank = i + 1;
            int updated = switch (type) {
                case "BEST_SELLER"  -> gameRepository.updateBestSellerRank(psStoreId, rank);
                default             -> gameRepository.updateMostDownloadedRank(psStoreId, rank);
            };

            if (updated > 0) {
                successCount++;
            } else {
                log.debug("DB 미존재 게임 스킵 (PS_STORE_ID: {})", psStoreId);
            }
        }

        log.info("[Ranking Update] 완료! 총 {}개 중 {}개 매칭 및 랭킹 부여 성공.", psStoreIds.size(), successCount);
    }
}