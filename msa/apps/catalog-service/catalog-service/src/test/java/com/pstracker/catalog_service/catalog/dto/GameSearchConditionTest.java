package com.pstracker.catalog_service.catalog.dto;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class GameSearchConditionTest {

    @Test
    @DisplayName("curationCacheKey: vibeTags 순서가 달라도 동일한 키를 반환한다")
    void curationCacheKey_vibeTagsOrderIndependent() {
        GameSearchCondition a = new GameSearchCondition();
        a.setVibeTags(List.of("액션", "감성", "힐링"));

        GameSearchCondition b = new GameSearchCondition();
        b.setVibeTags(List.of("힐링", "액션", "감성"));

        assertThat(a.curationCacheKey()).isEqualTo(b.curationCacheKey());
    }

    @Test
    @DisplayName("curationCacheKey: 필터 조건이 다르면 다른 키를 반환한다")
    void curationCacheKey_differentConditionsProduceDifferentKeys() {
        GameSearchCondition discounted = new GameSearchCondition();
        discounted.setVibeTags(List.of("액션"));
        discounted.setMinDiscountRate(50);

        GameSearchCondition plain = new GameSearchCondition();
        plain.setVibeTags(List.of("액션"));

        assertThat(discounted.curationCacheKey()).isNotEqualTo(plain.curationCacheKey());
    }

    @Test
    @DisplayName("curationCacheKey: 모든 필드가 null이어도 예외 없이 빈 키를 반환한다")
    void curationCacheKey_nullFieldsHandledGracefully() {
        GameSearchCondition condition = new GameSearchCondition();

        String key = condition.curationCacheKey();

        assertThat(key).isNotNull();
        // 모든 필드 null → 구분자(_)로만 구성된 문자열
        assertThat(key).doesNotContain("null");
    }
}
