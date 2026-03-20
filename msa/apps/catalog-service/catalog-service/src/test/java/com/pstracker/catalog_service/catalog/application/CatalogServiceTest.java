package com.pstracker.catalog_service.catalog.application;

import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.repository.GameRepository;
import com.pstracker.catalog_service.catalog.service.CatalogService;
import com.pstracker.catalog_service.catalog.service.GameReadService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.*;

@ExtendWith(MockitoExtension.class)
public class CatalogServiceTest {

    @InjectMocks
    private CatalogService catalogService;

    @Mock
    private GameReadService gameReadService;

    @Mock
    private GameRepository gameRepository;

    // ❌ CacheManager 모킹 삭제: CatalogService의 의존성이 아닙니다!

    @Test
    @DisplayName("게임 삭제 성공: 존재하는 ID 요청 시 삭제 및 캐시 초기화 메서드가 호출된다")
    void deleteGame_Success() {
        // given
        Long gameId = 1L;
        Game mockGame = Game.create("PPSA000", "Elden Ring", "Elden Ring", "FromSoftware", "img.jpg", "desc", LocalDate.of(2026,1,1));

        given(gameRepository.findById(gameId)).willReturn(Optional.of(mockGame));

        // when
        catalogService.deleteGame(gameId);

        // then
        // 1. 해당 게임 객체를 정확히 DB에서 지웠는지 검증
        verify(gameRepository, times(1)).delete(mockGame);

        // 2. 🚀 삭제 후 캐시 제거 로직이 호출되었는지 완벽하게 검증!
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
}