package com.pstracker.catalog_service.subscription.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.Arrays;

@Getter
@RequiredArgsConstructor
public enum PsPlusTier {
    ESSENTIAL("TIER_10", "에센셜"),
    SPECIAL("TIER_20", "스페셜"),
    DELUXE("TIER_30", "디럭스");

    private final String code;
    private final String displayName;

    public static PsPlusTier fromCode(String code) {
        return Arrays.stream(values())
                .filter(tier -> tier.getCode().equals(code))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("알 수 없는 티어 코드입니다: " + code));
    }
}
