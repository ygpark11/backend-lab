package com.pstracker.catalog_service.global.util;

public class ChosungUtils {

    // 한글 초성 배열 (19개)
    private static final char[] CHOSUNG_LIST = {
            'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
            'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
    };

    private static final int HANGUL_BASE = 0xAC00;
    private static final int HANGUL_END = 0xD7A3;

    /**
     * 입력된 문자열에서 한글 초성만 추출하여 반환
     * 한글이 아닌 문자(영어, 숫자, 띄어쓰기 등)는 그대로 유지
     * ex) "스텔라 블레이드 2" -> "ㅅㅌㄹ ㅂㄹㅇㄷ 2"
     */
    public static String extract(String text) {
        if (text == null || text.isBlank()) {
            return text;
        }

        StringBuilder result = new StringBuilder();

        for (char c : text.toCharArray()) {
            if (Character.isWhitespace(c)) {
                continue;
            }

            // 문자가 한글 '가' ~ '힣' 사이인지 확인
            if (c >= HANGUL_BASE && c <= HANGUL_END) {
                // 초성 인덱스 도출 공식: (문자코드 - 0xAC00) / (21 * 28)
                int chosungIndex = (c - HANGUL_BASE) / (21 * 28);
                result.append(CHOSUNG_LIST[chosungIndex]);
            } else {
                // 한글이 아니면(영어, 숫자, 공백 등) 특수문자 그대로 추가
                result.append(c);
            }
        }

        return result.toString();
    }
}
