package com.pstracker.catalog_service.catalog.domain;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class GameTest {

    private Game createGame() {
        return Game.create(
                "HP0700-PPSA001-GAME", "테스트 게임", "Test Game",
                "Publisher", "img.jpg", "desc",
                LocalDate.now().minusMonths(2)
        );
    }

    // ========== null 입력 ==========

    @Test
    @DisplayName("null 입력 → 기존 값 유지, false 반환")
    void updateEditionContents_NullInput_ReturnsFalse() {
        Game game = createGame();

        boolean changed = game.updateEditionContents(null);

        assertThat(changed).isFalse();
        assertThat(game.getEditionContents()).isNull();
    }

    // ========== 빈 배열 입력 ==========

    @Test
    @DisplayName("빈 배열 + 기존 없음 → null 유지, false 반환")
    void updateEditionContents_EmptyArray_NoExisting_ReturnsFalse() {
        Game game = createGame();

        boolean changed = game.updateEditionContents(List.of());

        assertThat(changed).isFalse();
        assertThat(game.getEditionContents()).isNull();
    }

    @Test
    @DisplayName("빈 배열 + 기존 데이터 있음 → 크롤러 수집 실패로 간주, 기존 값 보호")
    void updateEditionContents_EmptyArray_ExistingData_PreservesExisting() {
        Game game = createGame();
        game.updateEditionContents(List.of("기본 게임", "DLC 팩")); // 기존 데이터 세팅

        boolean changed = game.updateEditionContents(List.of()); // 빈 배열로 재수집

        assertThat(changed).isFalse();
        assertThat(game.getEditionContents()).containsExactly("DLC 팩", "기본 게임"); // sorted 된 상태로 보존
    }

    // ========== 유효한 입력 ==========

    @Test
    @DisplayName("유효한 목록 → 정렬 후 저장, true 반환")
    void updateEditionContents_ValidList_SavesSortedAndReturnsTrue() {
        Game game = createGame();

        boolean changed = game.updateEditionContents(List.of("기본 게임", "DLC 팩"));

        assertThat(changed).isTrue();
        assertThat(game.getEditionContents()).containsExactly("DLC 팩", "기본 게임"); // 가나다순 정렬
    }

    // ========== 중복 변경 방지 ==========

    @Test
    @DisplayName("동일 목록 재수집 → 변경 없음, false 반환")
    void updateEditionContents_SameContent_ReturnsFalse() {
        Game game = createGame();
        game.updateEditionContents(List.of("기본 게임"));

        boolean changed = game.updateEditionContents(List.of("기본 게임"));

        assertThat(changed).isFalse();
    }

    @Test
    @DisplayName("순서만 다른 동일 목록 → 정렬 후 동일, false 반환 (불필요한 캐시 eviction 방지)")
    void updateEditionContents_DifferentOrderSameContent_ReturnsFalse() {
        Game game = createGame();
        game.updateEditionContents(List.of("기본 게임", "DLC 팩"));

        boolean changed = game.updateEditionContents(List.of("DLC 팩", "기본 게임")); // 순서 역전

        assertThat(changed).isFalse();
    }

    // ========== 정규화 ==========

    @Test
    @DisplayName("공백 항목 포함 → 필터링 후 저장")
    void updateEditionContents_WithBlankItems_Filtered() {
        Game game = createGame();

        boolean changed = game.updateEditionContents(List.of("기본 게임", "  ", "DLC 팩"));

        assertThat(changed).isTrue();
        assertThat(game.getEditionContents()).containsExactly("DLC 팩", "기본 게임");
    }

    @Test
    @DisplayName("null 원소 포함 리스트 → 필터링 후 저장")
    void updateEditionContents_WithNullElements_Filtered() {
        Game game = createGame();

        // List.of()는 null 원소를 허용하지 않으므로 Arrays.asList 사용
        boolean changed = game.updateEditionContents(Arrays.asList("기본 게임", null, "DLC 팩"));

        assertThat(changed).isTrue();
        assertThat(game.getEditionContents()).containsExactly("DLC 팩", "기본 게임");
    }

    @Test
    @DisplayName("중복 항목 포함 → 중복 제거 후 저장")
    void updateEditionContents_WithDuplicates_Deduplicated() {
        Game game = createGame();

        boolean changed = game.updateEditionContents(List.of("기본 게임", "기본 게임", "DLC 팩"));

        assertThat(changed).isTrue();
        assertThat(game.getEditionContents()).containsExactly("DLC 팩", "기본 게임");
        assertThat(game.getEditionContents()).hasSize(2);
    }
}
