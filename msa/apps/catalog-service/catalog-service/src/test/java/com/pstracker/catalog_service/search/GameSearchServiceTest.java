package com.pstracker.catalog_service.search;

import com.pstracker.catalog_service.catalog.dto.GameSuggestResponse;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class GameSearchServiceTest {

    @Mock
    private MeilisearchClient client;

    private SimpleMeterRegistry meterRegistry;
    private GameSearchService gameSearchService;

    @BeforeEach
    void setUp() {
        meterRegistry = new SimpleMeterRegistry();
        gameSearchService = new GameSearchService(client, meterRegistry);
    }

    @Test
    @DisplayName("Meilisearch 비활성화 시 Optional.empty를 반환해 MySQL 폴백을 유도한다")
    void disabled_returnsEmpty() {
        given(client.isEnabled()).willReturn(false);

        assertThat(gameSearchService.suggest("사이버펑크", 5)).isEmpty();
        assertThat(gameSearchService.searchGameIds("사이버펑크")).isEmpty();
        assertThat(meterRegistry.counter("pstracker.search.fallback", "endpoint", "search").count()).isZero();
    }

    @Test
    @DisplayName("순수 초성 쿼리('ㄱㅇㅆ')는 chosungAscii 단일 검색으로 조회한다")
    void pureChosungQuery_usesSingleSearch() {
        given(client.isEnabled()).willReturn(true);
        given(client.searchSingle(any())).willReturn(Map.of(
                "hits", List.of(
                        Map.of("id", 1, "displayName", "Ghost of Tsushima 디렉터스 컷", "imageUrl", "img1.jpg")
                )
        ));

        Optional<List<GameSuggestResponse>> result = gameSearchService.suggest("ㄱㅇㅆ", 5);

        assertThat(result).isPresent();
        assertThat(result.get()).hasSize(1);
        assertThat(result.get().get(0).id()).isEqualTo(1L);
        verify(client).searchSingle(any());
    }

    @Test
    @DisplayName("일반 쿼리에서 원문 검색 결과가 비어 있으면 QWERTY-자모 오타 결과를 반환한다")
    void typoQuery_returnsQwertyHitsWhenPrimaryEmpty() {
        given(client.isEnabled()).willReturn(true);
        given(client.getIndexName()).willReturn("games");
        given(client.getMaxSearchLimit()).willReturn(500);
        given(client.multiSearch(any())).willReturn(Map.of(
                "results", List.of(
                        Map.of("hits", List.of()),
                        Map.of("hits", List.of(
                                Map.of("id", 436, "_rankingScore", 0.68),
                                Map.of("id", 2170, "_rankingScore", 0.66)
                        ))
                )
        ));

        Optional<List<Long>> ids = gameSearchService.searchGameIds("싸펑");

        assertThat(ids).isPresent();
        assertThat(ids.get()).containsExactly(436L, 2170L);
    }

    @Test
    @DisplayName("원문 검색 결과가 이미 있으면 저신뢰도 QWERTY 노이즈(0.65 미만)를 필터링한다")
    void primaryHitPresent_filtersLowConfidenceQwertyNoise() {
        given(client.isEnabled()).willReturn(true);
        given(client.getIndexName()).willReturn("games");
        given(client.getMaxSearchLimit()).willReturn(500);
        given(client.multiSearch(any())).willReturn(Map.of(
                "results", List.of(
                        Map.of("hits", List.of(Map.of("id", 386, "_rankingScore", 0.785))),
                        Map.of("hits", List.of(
                                Map.of("id", 386, "_rankingScore", 0.75),
                                Map.of("id", 4512, "_rankingScore", 0.49)
                        ))
                )
        ));

        Optional<List<Long>> ids = gameSearchService.searchGameIds("피파");

        assertThat(ids).isPresent();
        assertThat(ids.get()).containsExactly(386L);
    }

    @Test
    @DisplayName("Meilisearch 통신 장애·타임아웃 시 예외를 삼키고 Optional.empty 반환 및 폴백 메트릭을 증가시킨다")
    void clientException_recordsFallbackAndReturnsEmpty() {
        given(client.isEnabled()).willReturn(true);
        given(client.getIndexName()).willReturn("games");
        given(client.getMaxSearchLimit()).willReturn(500);
        given(client.multiSearch(any())).willThrow(new RuntimeException("Connection timed out"));

        Optional<List<Long>> result = gameSearchService.searchGameIds("엘든링");

        assertThat(result).isEmpty();
        assertThat(meterRegistry.counter("pstracker.search.fallback", "endpoint", "search").count()).isEqualTo(1.0);
    }

    @Test
    @DisplayName("빈 문자열 키워드는 Meilisearch를 호출하지 않는다")
    void blankKeyword_skipsClient() {
        given(client.isEnabled()).willReturn(true);

        assertThat(gameSearchService.suggest("   ", 5)).isEmpty();
        assertThat(gameSearchService.searchGameIds("")).isEmpty();
        verify(client, never()).searchSingle(any());
        verify(client, never()).multiSearch(any());
        assertThat(meterRegistry.getMeters()).isEmpty();
    }
}
