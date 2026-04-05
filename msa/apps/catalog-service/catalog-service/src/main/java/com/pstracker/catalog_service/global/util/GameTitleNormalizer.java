package com.pstracker.catalog_service.global.util;

import java.text.Normalizer;

import static org.springframework.util.StringUtils.hasText;

public class GameTitleNormalizer {

    public static String cleanMojibakeOnly(String rawTitle) {
        if (!hasText(rawTitle)) return "";
        return rawTitle
                .replaceAll("\u0080\u0099", "'").replaceAll("â\u0080\u0099", "'")
                .replaceAll("\u0080\u009C", "\"").replaceAll("\u0080\u009D", "\"")
                .replaceAll("’", "'").replaceAll("‘", "'")
                .replaceAll("YEAH! YOU WANT \\\\\\\\", "")
                .replaceAll("\u0084", " ").replaceAll("[Â„€“”™®©â¢]", " ")
                .replaceAll("＆", "&").replaceAll("\\t", " ")
                .replaceAll("[:,&+–-]", " ")
                .replaceAll("\\s+", " ").strip();
    }

    public static String normalizeAggressive(String title) {
        if (!hasText(title)) return "";

        String result = Normalizer.normalize(title, Normalizer.Form.NFD).replaceAll("\\p{M}", "");

        return result
                .replaceAll("\\(.*?\\)", "")
                .replaceAll("\\[.*?\\]", "")
                .replaceAll("(?i)PlayStation\\s*Hits", "")
                .replaceAll("(?i)\\b(demo|trial|full game)\\b", "")
                // 에디션, 플랫폼, 마케팅 용어 등을 완전히 제거하는 로직 (IGDB용)
                .replaceAll("(?i)\\b((standard|deluxe|ultimate|premium|collector's|complete|digital|director's|game of the year|goty|cross-gen|launch|special|anniversary|sound|anime|music|bgm|gold|silver|platinum|definitive|expanded|master|legacy|galactic|unlimited|championship|contribution|franchise|evolved|extras|year\\s*\\d+|ragnarok|valhalla|sinful|ritual|rebuild|deadman)\\s*)+(edition|cut|ver|version|bundle|pack|set|collection|anthology)\\b", "")
                .replaceAll("(?i)\\b(ps4|ps5|ps\\s?vr2|ps\\s?vr|remastered|remaster|collection)\\b", "")
                .replaceAll("(?i)\\b(digital|deluxe|premium|standard|ultimate|anniversary|gold|silver|platinum|definitive|expanded|master|legacy|galactic|unlimited|championship|contribution|franchise|evolved|extras|sinful|ritual|rebuild|deadman)\\s*$", "")
                .replaceAll("[:\\-,&\\+]", " ")
                .replaceAll("\\s+", " ").strip();
    }

    public static String extractCoreTitle(String title) {
        if (!hasText(title)) return "";

        String[] parts = title.split("[:\\-–]");
        if (parts.length > 0) {
            String mainPart = parts[0].trim();
            if (mainPart.length() >= 3) {
                return mainPart;
            }
        }
        return title;
    }

}
