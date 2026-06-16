package com.pstracker.catalog_service.catalog.application;

import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.dto.CollectRequestDto;
import com.pstracker.catalog_service.catalog.dto.GameSearchCondition;
import com.pstracker.catalog_service.catalog.dto.GameSearchResultDto;
import com.pstracker.catalog_service.catalog.infrastructure.IgdbApiClient;
import com.pstracker.catalog_service.catalog.repository.GamePriceHistoryRepository;
import com.pstracker.catalog_service.catalog.repository.GameRepository;
import com.pstracker.catalog_service.catalog.service.CatalogService;
import com.pstracker.catalog_service.catalog.service.GameReadService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.*;
import static org.mockito.Mockito.never;

@ExtendWith(MockitoExtension.class)
public class CatalogServiceTest {

    @InjectMocks
    private CatalogService catalogService;

    @Mock private GameReadService gameReadService;
    @Mock private GameRepository gameRepository;
    @Mock private GamePriceHistoryRepository priceHistoryRepository;
    @Mock private IgdbApiClient igdbApiClient;

    // ========== deleteGame ==========

    @Test
    @DisplayName("게임 삭제 성공: 존재하는 ID 요청 시 삭제 및 캐시 초기화 메서드가 호출된다")
    void deleteGame_Success() {
        // given
        Long gameId = 1L;
        Game mockGame = Game.create("PPSA000", "Elden Ring", "Elden Ring", "FromSoftware", "img.jpg", "desc", LocalDate.of(2026, 1, 1));

        given(gameRepository.findById(gameId)).willReturn(Optional.of(mockGame));

        // when
        catalogService.deleteGame(gameId);

        // then
        verify(gameRepository, times(1)).delete(mockGame);
        verify(gameReadService, times(1)).evictGameDetailCache(gameId);
    }

    @Test
    @DisplayName("게임 삭제 실패: 존재하지 않는 ID 요청 시 예외가 발생한다")
    void deleteGame_Fail_NotFound() {
        // given
        Long invalidId = 999L;

        given(gameRepository.findById(invalidId)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> catalogService.deleteGame(invalidId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("해당 게임을 찾을 수 없습니다");
    }

    // ========== upsertGameData — editionContents ==========

    @Test
    @DisplayName("upsertGameData: editionContents 신규 수집 시 family 캐시 무효화가 호출된다")
    void upsertGameData_NewEditionContents_EvictsFamilyCache() {
        // given: 기존에 editionContents가 없는 게임
        Game existingGame = createExistingGame();
        CollectRequestDto request = buildRequest();
        request.setEditionContents(List.of("기본 게임", "DLC 팩"));

        given(gameRepository.findByPsStoreIdWithGenres("HP0700-PPSA001-GAME")).willReturn(Optional.of(existingGame));
        given(igdbApiClient.searchGame(any())).willReturn(null);
        given(priceHistoryRepository.findTopByGameOrderByCreatedAtDesc(any())).willReturn(Optional.empty());

        // when
        catalogService.upsertGameData(request);

        // then: editionContents가 null → ["기본 게임", "DLC 팩"]으로 변경됐으므로 family evict 호출
        verify(gameReadService).evictFamilyGameDetailCaches(existingGame.getFamilyId(), existingGame.getId());
    }

    @Test
    @DisplayName("upsertGameData: editionContents가 동일하면 family 캐시 무효화가 호출되지 않는다")
    void upsertGameData_SameEditionContents_NoFamilyEviction() {
        // given: 기존에 동일한 editionContents가 있는 게임
        Game existingGame = createExistingGame();
        existingGame.updateEditionContents(List.of("기본 게임"));

        CollectRequestDto request = buildRequest();
        request.setEditionContents(List.of("기본 게임")); // 동일 내용

        given(gameRepository.findByPsStoreIdWithGenres("HP0700-PPSA001-GAME")).willReturn(Optional.of(existingGame));
        given(igdbApiClient.searchGame(any())).willReturn(null);
        given(priceHistoryRepository.findTopByGameOrderByCreatedAtDesc(any())).willReturn(Optional.empty());

        // when
        catalogService.upsertGameData(request);

        // then: 변경 없으므로 family evict 미호출
        verify(gameReadService, never()).evictFamilyGameDetailCaches(any(), any());
    }

    @Test
    @DisplayName("upsertGameData: 가격이 0이면 처리를 건너뛰고 어떤 저장도 발생하지 않는다")
    void upsertGameData_ZeroPrice_SkipsAllProcessing() {
        // given
        CollectRequestDto request = buildRequest();
        request.setCurrentPrice(0);

        // when
        catalogService.upsertGameData(request);

        // then
        verify(gameRepository, never()).findByPsStoreIdWithGenres(any());
        verify(gameRepository, never()).save(any());
        verify(gameReadService, never()).evictGameDetailCache(any());
    }

    // ========== searchGames — curation 분기 ==========

    @Test
    @DisplayName("searchGames: curation=true 이면 gameReadService.searchGamesForCuration에 위임한다")
    void searchGames_CurationTrue_DelegatesToGameReadService() {
        // given
        GameSearchCondition condition = new GameSearchCondition();
        condition.setCuration(true);
        Pageable pageable = PageRequest.of(0, 3);

        given(gameReadService.searchGamesForCuration(any(), any())).willReturn(Page.empty());

        // when
        Page<GameSearchResultDto> result = catalogService.searchGames(condition, pageable, null);

        // then
        verify(gameReadService, times(1)).searchGamesForCuration(eq(condition), any(Pageable.class));
        verify(gameRepository, never()).searchGames(any(), any());
        assertThat(result).isNotNull();
    }

    @Test
    @DisplayName("searchGames: curation=false 이면 gameRepository.searchGames를 직접 호출한다")
    void searchGames_CurationFalse_CallsRepository() {
        // given
        GameSearchCondition condition = new GameSearchCondition();
        condition.setCuration(false);
        Pageable pageable = PageRequest.of(0, 20);

        given(gameRepository.searchGames(any(), any())).willReturn(Page.empty());

        // when
        Page<GameSearchResultDto> result = catalogService.searchGames(condition, pageable, null);

        // then
        verify(gameRepository, times(1)).searchGames(eq(condition), any(Pageable.class));
        verify(gameReadService, never()).searchGamesForCuration(any(), any());
        assertThat(result).isNotNull();
    }

    // ========== helpers ==========

    /** id가 세팅된 기존 게임 엔티티 생성. 최근 출시 아님(2개월 전) → crawlJob 재등록 없음. */
    private Game createExistingGame() {
        Game game = Game.create(
                "HP0700-PPSA001-GAME", "Test Game", "Test Game EN",
                "Publisher", "img.jpg", "desc",
                LocalDate.now().minusMonths(2)
        );
        ReflectionTestUtils.setField(game, "id", 1L);
        return game;
    }

    /** 기본 수집 요청 DTO. genreIds=null 이라 genreRepository 호출 없음. */
    private CollectRequestDto buildRequest() {
        CollectRequestDto dto = new CollectRequestDto();
        dto.setPsStoreId("HP0700-PPSA001-GAME");
        dto.setTitle("Test Game");
        dto.setOriginalPrice(69900);
        dto.setCurrentPrice(69900);
        dto.setDiscountRate(0);
        dto.setReleaseDate(LocalDate.now().minusMonths(2));
        return dto;
    }
}
