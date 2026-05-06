package com.pstracker.catalog_service.global.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum PriceVerdict {
    TRACKING("아직 데이터를 모으고 있어요! 조금만 기다려주세요 🕵️", "text-blue-500"),
    BUY_NOW("🔥 지금이 기회! 역대 최저가입니다.", "text-red-500"),
    GOOD_OFFER("🤔 나쁘지 않은 할인! (최저가는 아님)", "text-yellow-500"),
    WAIT("✋ 잠시만요! 지금은 비쌉니다.", "text-gray-500");

    private final String message;
    private final String colorClass; // 프론트엔드 Tailwind 클래스 힌트
}
