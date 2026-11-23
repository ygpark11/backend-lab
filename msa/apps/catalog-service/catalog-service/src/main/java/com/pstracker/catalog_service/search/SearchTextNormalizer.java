package com.pstracker.catalog_service.search;

import com.pstracker.catalog_service.catalog.domain.Game;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * PS-Tracker 검색 색인/쿼리용 한글·영문 텍스트 정규화 유틸리티.
 * - 언어 태그·상표 기호 정제 (cleanTitle)
 * - 두벌식 QWERTY-자모 ASCII 인코딩 (한글 오타 + 한영키 실수 양방향 대응, Meilisearch charabia 토크나이저 분리 방지)
 * - 19개 초성 고유 ASCII 매핑 (초성 검색 유지 + 영문 게임 별칭 초성 지원 + 무의미 초성 오탐 차단)
 */
public final class SearchTextNormalizer {

    private static final int HANGUL_SYLLABLE_START = 0xAC00;
    private static final int HANGUL_SYLLABLE_END = 0xD7A3;

    private static final char[] CHOSUNG_LIST = {
            'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
            'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
    };

    // 19개 초성을 서로 다른 ASCII 소문자 1글자(a~s)에 1:1 매핑
    private static final Map<Character, Character> CHOSUNG_ASCII_MAP = Map.ofEntries(
            Map.entry('ㄱ', 'a'), Map.entry('ㄲ', 'b'), Map.entry('ㄴ', 'c'),
            Map.entry('ㄷ', 'd'), Map.entry('ㄸ', 'e'), Map.entry('ㄹ', 'f'),
            Map.entry('ㅁ', 'g'), Map.entry('ㅂ', 'h'), Map.entry('ㅃ', 'i'),
            Map.entry('ㅅ', 'j'), Map.entry('ㅆ', 'k'), Map.entry('ㅇ', 'l'),
            Map.entry('ㅈ', 'm'), Map.entry('ㅉ', 'n'), Map.entry('ㅊ', 'o'),
            Map.entry('ㅋ', 'p'), Map.entry('ㅌ', 'q'), Map.entry('ㅍ', 'r'),
            Map.entry('ㅎ', 's')
    );

    // 두벌식 QWERTY 소문자 키열 (쌍자음 ㄲ/ㄸ/ㅃ/ㅆ/ㅉ는 단자음과 동일 키로 통합, ㅐ/ㅒ·ㅔ/ㅖ도 자연 흡수)
    private static final String[] CHOSUNG_QWERTY = {
            "r", "r", "s", "e", "e", "f", "a", "q", "q", "t",
            "t", "d", "w", "w", "c", "z", "x", "v", "g"
    };
    private static final String[] JUNGSUNG_QWERTY = {
            "k", "o", "i", "o", "j", "p", "u", "p", "h", "hk", "ho",
            "hl", "y", "n", "nj", "np", "nl", "b", "m", "ml", "l"
    };
    private static final String[] JONGSUNG_QWERTY = {
            "", "r", "r", "rt", "s", "sw", "sg", "e", "f", "fr", "fa", "fq", "ft", "fx", "fv", "fg",
            "a", "q", "qt", "t", "t", "d", "w", "c", "z", "x", "v", "g"
    };

    // 단독 호환 자모(ㄱ~ㅎ, ㅏ~ㅣ)도 두벌식 QWERTY로 매핑 (영어를 한글 자판으로 잘못 친 입력까지 대응)
    private static final Map<Character, String> COMPAT_JAMO_QWERTY = Map.ofEntries(
            Map.entry('ㄱ', "r"), Map.entry('ㄲ', "r"), Map.entry('ㄴ', "s"), Map.entry('ㄷ', "e"),
            Map.entry('ㄸ', "e"), Map.entry('ㄹ', "f"), Map.entry('ㅁ', "a"), Map.entry('ㅂ', "q"),
            Map.entry('ㅃ', "q"), Map.entry('ㅅ', "t"), Map.entry('ㅆ', "t"), Map.entry('ㅇ', "d"),
            Map.entry('ㅈ', "w"), Map.entry('ㅉ', "w"), Map.entry('ㅊ', "c"), Map.entry('ㅋ', "z"),
            Map.entry('ㅌ', "x"), Map.entry('ㅍ', "v"), Map.entry('ㅎ', "g"),
            Map.entry('ㅏ', "k"), Map.entry('ㅐ', "o"), Map.entry('ㅑ', "i"), Map.entry('ㅒ', "o"),
            Map.entry('ㅓ', "j"), Map.entry('ㅔ', "p"), Map.entry('ㅕ', "u"), Map.entry('ㅖ', "p"),
            Map.entry('ㅗ', "h"), Map.entry('ㅘ', "hk"), Map.entry('ㅙ', "ho"), Map.entry('ㅚ', "hl"),
            Map.entry('ㅛ', "y"), Map.entry('ㅜ', "n"), Map.entry('ㅝ', "nj"), Map.entry('ㅞ', "np"),
            Map.entry('ㅟ', "nl"), Map.entry('ㅠ', "b"), Map.entry('ㅡ', "m"), Map.entry('ㅢ', "ml"),
            Map.entry('ㅣ', "l")
    );

    private static final List<String> LANG_KEYWORDS = List.of(
            "한국어", "영어", "일본어", "중국어", "태국어", "독일어", "프랑스어", "스페인어"
    );

    private static final Pattern TRADEMARK_PATTERN = Pattern.compile("[™®©]");
    private static final Pattern NON_SEARCHABLE_PATTERN = Pattern.compile("[^0-9a-zA-Z가-힣ㄱ-ㅎㅏ-ㅣ]+");
    private static final Pattern KOR_TO_NUM_PATTERN = Pattern.compile("([가-힣])([0-9])");
    private static final Pattern NUM_TO_KOR_PATTERN = Pattern.compile("([0-9])([가-힣])");
    private static final Pattern PURE_CHOSUNG_PATTERN = Pattern.compile("[ㄱ-ㅎ0-9\\s]+");
    private static final Pattern HAS_CHOSUNG_PATTERN = Pattern.compile("[ㄱ-ㅎ]");
    private static final Pattern PURE_LATIN_PATTERN = Pattern.compile("[a-zA-Z0-9\\s]+");

    private SearchTextNormalizer() {
    }

    /**
     * PS 스토어 제목 뒤의 지원 언어 괄호("(중국어(간체자), 한국어, ...)") 및 상표 기호(™, ®, ©) 제거.
     */
    public static String cleanTitle(String title) {
        if (title == null || title.isBlank()) {
            return "";
        }
        String result = title;
        int firstLangIdx = Integer.MAX_VALUE;
        for (String lang : LANG_KEYWORDS) {
            int idx = result.indexOf(lang);
            if (idx != -1 && idx < firstLangIdx) {
                firstLangIdx = idx;
            }
        }
        if (firstLangIdx != Integer.MAX_VALUE) {
            int parenIdx = result.lastIndexOf('(', firstLangIdx);
            if (parenIdx > 0) {
                result = result.substring(0, parenIdx).trim();
            }
        }
        return TRADEMARK_PATTERN.matcher(result).replaceAll("").trim();
    }

    /**
     * 특수문자를 공백으로 치환하고 한글-숫자 경계를 분리한다. (예: "파판7" -> "파판 7", "위쳐3" -> "위쳐 3")
     */
    public static String tokenizeAndSplitKorNum(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }
        String cleaned = NON_SEARCHABLE_PATTERN.matcher(text).replaceAll(" ").trim();
        cleaned = KOR_TO_NUM_PATTERN.matcher(cleaned).replaceAll("$1 $2");
        cleaned = NUM_TO_KOR_PATTERN.matcher(cleaned).replaceAll("$1 $2");
        return cleaned.replaceAll("\\s+", " ").trim();
    }

    /**
     * 한글 음절 및 호환 자모를 두벌식 QWERTY 소문자 ASCII 문자열로 변환한다.
     * 영문·숫자·공백은 소문자로 유지한다.
     */
    public static String toQwertyJamo(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }
        StringBuilder sb = new StringBuilder(text.length() * 2);
        for (int i = 0; i < text.length(); i++) {
            char ch = text.charAt(i);
            if (ch >= HANGUL_SYLLABLE_START && ch <= HANGUL_SYLLABLE_END) {
                int offset = ch - HANGUL_SYLLABLE_START;
                int cho = offset / (21 * 28);
                int jung = (offset % (21 * 28)) / 28;
                int jong = offset % 28;
                sb.append(CHOSUNG_QWERTY[cho]);
                sb.append(JUNGSUNG_QWERTY[jung]);
                if (jong > 0) {
                    sb.append(JONGSUNG_QWERTY[jong]);
                }
            } else {
                String jamoKey = COMPAT_JAMO_QWERTY.get(ch);
                if (jamoKey != null) {
                    sb.append(jamoKey);
                } else {
                    sb.append(Character.toLowerCase(ch));
                }
            }
        }
        return sb.toString().replaceAll("\\s+", " ").trim();
    }

    /**
     * 색인 문서용 ASCII 초성 토큰 생성.
     * 한글이 포함된 단어에서만 초성(+붙은 숫자)을 추출하여 영문 제목의 숫자("PS4 PS5")가 초성 필드를 오염시키지 않도록 한다.
     * 예: "용과 같이8 외전" -> "lcal8lm lc al8 lm"
     */
    public static String toChosungAsciiTokens(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }
        String[] words = NON_SEARCHABLE_PATTERN.matcher(text).replaceAll(" ").trim().split("\\s+");
        Set<String> tokens = new LinkedHashSet<>();
        StringBuilder compact = new StringBuilder();

        for (String word : words) {
            if (word.isEmpty()) {
                continue;
            }
            boolean containsKorean = false;
            StringBuilder wordBuf = new StringBuilder();
            for (int i = 0; i < word.length(); i++) {
                char ch = word.charAt(i);
                if (ch >= HANGUL_SYLLABLE_START && ch <= HANGUL_SYLLABLE_END) {
                    char cho = CHOSUNG_LIST[(ch - HANGUL_SYLLABLE_START) / (21 * 28)];
                    wordBuf.append(CHOSUNG_ASCII_MAP.get(cho));
                    containsKorean = true;
                } else if (CHOSUNG_ASCII_MAP.containsKey(ch)) {
                    wordBuf.append(CHOSUNG_ASCII_MAP.get(ch));
                    containsKorean = true;
                } else if (Character.isDigit(ch)) {
                    wordBuf.append(ch);
                }
            }
            if (containsKorean && !wordBuf.isEmpty()) {
                String token = wordBuf.toString();
                compact.append(token);
                tokens.add(token);
            }
        }
        if (compact.isEmpty()) {
            return "";
        }
        Set<String> ordered = new LinkedHashSet<>();
        ordered.add(compact.toString());
        ordered.addAll(tokens);
        return String.join(" ", ordered);
    }

    /**
     * 순수 초성(+숫자) 사용자 쿼리를 ASCII 초성 문자열로 변환한다.
     * 예: "ㅇㄱㄱㅇ8" -> "lcal8", "ㄱㅇㅆ" -> "alk"
     */
    public static String queryToChosungAscii(String query) {
        if (query == null || query.isBlank()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < query.length(); i++) {
            char ch = query.charAt(i);
            Character mapped = CHOSUNG_ASCII_MAP.get(ch);
            if (mapped != null) {
                sb.append(mapped);
            } else if (Character.isDigit(ch)) {
                sb.append(ch);
            }
        }
        return sb.toString();
    }

    public static boolean isPureChosungQuery(String query) {
        if (query == null) {
            return false;
        }
        String trimmed = query.trim();
        return !trimmed.isEmpty()
                && PURE_CHOSUNG_PATTERN.matcher(trimmed).matches()
                && HAS_CHOSUNG_PATTERN.matcher(trimmed).find();
    }

    public static boolean hasHangul(String text) {
        if (text == null) {
            return false;
        }
        for (int i = 0; i < text.length(); i++) {
            char ch = text.charAt(i);
            if ((ch >= HANGUL_SYLLABLE_START && ch <= HANGUL_SYLLABLE_END) || COMPAT_JAMO_QWERTY.containsKey(ch)) {
                return true;
            }
        }
        return false;
    }

    public static boolean isPureLatinOrDigit(String text) {
        if (text == null) {
            return false;
        }
        String trimmed = text.trim();
        return !trimmed.isEmpty() && PURE_LATIN_PATTERN.matcher(trimmed).matches();
    }

    /**
     * 검색 동점 시 대표작 본편이 디럭스·번들·추가 콘텐츠보다 상단에 노출되도록 인기도 점수를 계산한다.
     */
    public static int computePopularity(Game game) {
        int score = 0;
        if (game.getBestSellerRank() != null) {
            score += Math.max(0, 600 - game.getBestSellerRank());
        }
        if (game.getMostDownloadedRank() != null) {
            score += Math.max(0, 400 - game.getMostDownloadedRank());
        }
        Integer critic = game.getMcMetaScore() != null ? game.getMcMetaScore() : game.getIgdbCriticScore();
        if (critic != null) {
            score += critic * 2;
        }

        String name = game.getName() != null ? game.getName() : "";
        String lower = name.toLowerCase();
        if (name.contains("추가 콘텐츠") || name.contains("의상 세트")) {
            score -= 150;
        }
        if (lower.contains("디럭스") || lower.contains("딜럭스") || lower.contains("deluxe")
                || lower.contains("얼티밋") || lower.contains("ultimate")
                || lower.contains("번들") || lower.contains("bundle")
                || lower.contains("컴플리트") || lower.contains("complete")
                || lower.contains("시즌패스") || lower.contains("season pass")) {
            score -= 40;
        }
        return score;
    }
}
