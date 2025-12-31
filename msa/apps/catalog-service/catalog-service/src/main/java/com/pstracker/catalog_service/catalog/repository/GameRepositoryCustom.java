package com.pstracker.catalog_service.catalog.repository;

import com.pstracker.catalog_service.catalog.dto.GameSearchCondition;
import com.pstracker.catalog_service.catalog.dto.GameSearchResultDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface GameRepositoryCustom {
    /**
     * 게임 검색
     * @param condition 검색 조건
     * @param pageable 페이징 정보
     * @return 검색 결과 페이지
     */
    Page<GameSearchResultDto> searchGames(GameSearchCondition condition, Pageable pageable);

    /**
     * 연관 게임 추천
     * @param genreIds 기준 게임이 가진 장르 ID 목록
     * @param excludeGameId 추천에서 제외할 현재 게임 ID (자기 자신)
     * @param limit 가져올 개수
     * @return 추천 게임 리스트
     */
    List<GameSearchResultDto> findRelatedGames(List<Long> genreIds, Long excludeGameId, int limit);
}
