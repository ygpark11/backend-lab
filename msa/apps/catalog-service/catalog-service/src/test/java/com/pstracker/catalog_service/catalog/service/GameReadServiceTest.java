package com.pstracker.catalog_service.catalog.service;

import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.dto.GameDetailResponse;
import com.pstracker.catalog_service.catalog.repository.GamePriceHistoryRepository;
import com.pstracker.catalog_service.catalog.repository.GameRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.CacheManager;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class GameReadServiceTest {

    @InjectMocks
    private GameReadService gameReadService;

    @Mock private GameRepository gameRepository;
    @Mock private GamePriceHistoryRepository priceHistoryRepository;
    @Mock private CacheManager cacheManager;

    @Test
    @DisplayName("familyId 가 null 인 게임 상세 조회 시 family 목록 DB 조회를 수행하지 않는다")
    void getBaseGameDetail_nullFamilyId_skipsFamilyQuery() {
        Game game = Game.create("PPSA001", "테스트 게임", "Test Game", "Publisher",
                "img.jpg", "desc", LocalDate.of(2026, 1, 1));
        ReflectionTestUtils.setField(game, "id", 10L);
        ReflectionTestUtils.setField(game, "familyId", null);
        game.updatePriceSearchInfo(50000, 30000, 40, false, null, false);

        given(gameRepository.findByIdWithGenres(10L)).willReturn(Optional.of(game));
        given(priceHistoryRepository.findAllByGameIdOrderByCreatedAtAsc(10L)).willReturn(List.of());

        GameDetailResponse detail = gameReadService.getBaseGameDetail(10L);

        assertThat(detail.familyGames()).isEmpty();
        verify(gameRepository, never()).findByFamilyIdOrderByOriginalPriceAsc(null);
    }
}
