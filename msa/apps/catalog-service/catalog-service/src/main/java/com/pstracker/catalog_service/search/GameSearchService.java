package com.pstracker.catalog_service.search;

import com.pstracker.catalog_service.catalog.dto.GameSuggestResponse;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Meilisearch 기반 검색 및 자동완성 서비스.
 * - 모든 호출은 비활성화/장애/타임아웃 시 Optional.empty()를 반환해 호출부(CatalogService)가 MySQL로 자동 폴백하도록 보장한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GameSearchService {

    private static final List<String> PRIMARY_ATTRS = List.of("name", "englishName", "searchKeywords");
    private static final List<String> QWERTY_ATTRS = List.of("qwertyText");
    private static final List<String> CHOSUNG_ATTRS = List.of("chosungAscii");
    private static final List<String> RETRIEVE_ID_ONLY = List.of("id");
    private static final List<String> RETRIEVE_SUGGEST = List.of("id", "displayName", "imageUrl");

    private static final double PRIMARY_SCORE_THRESHOLD = 0.55;
    private static final double PRIMARY_SCORE_BONUS = 0.05;
    private static final double SUPPLEMENT_QWERTY_THRESHOLD = 0.65;

    private final MeilisearchClient client;
    private final MeterRegistry meterRegistry;

    /**
     * 자동완성 후보 조회. 실패/비활성화 시 Optional.empty() 반환 → MySQL 폴백.
     */
    public Optional<List<GameSuggestResponse>> suggest(String keyword, int limit) {
        if (!client.isEnabled() || !StringUtils.hasText(keyword)) {
            return Optional.empty();
        }
        try {
            List<Map<String, Object>> hits = executeSearch(keyword, limit, RETRIEVE_SUGGEST);
            List<GameSuggestResponse> result = new ArrayList<>(hits.size());
            for (Map<String, Object> hit : hits) {
                Long id = toLong(hit.get("id"));
                if (id == null) {
                    continue;
                }
                String name = hit.get("displayName") != null ? hit.get("displayName").toString() : "";
                String imageUrl = hit.get("imageUrl") != null ? hit.get("imageUrl").toString() : null;
                result.add(new GameSuggestResponse(id, name, imageUrl));
            }
            return Optional.of(result);
        } catch (Exception e) {
            recordFallback("suggest", e);
            return Optional.empty();
        }
    }

    /**
     * 키워드 매칭 게임 ID 목록(관련도 순, 최대 maxSearchLimit건) 조회.
     * - 정상 응답이지만 결과가 0건인 경우: Optional.of(List.of()) 반환 (MySQL 조회 생략 가능)
     * - 장애/타임아웃/비활성화인 경우: Optional.empty() 반환 → MySQL 폴백
     */
    public Optional<List<Long>> searchGameIds(String keyword) {
        if (!client.isEnabled() || !StringUtils.hasText(keyword)) {
            return Optional.empty();
        }
        try {
            List<Map<String, Object>> hits = executeSearch(keyword, client.getMaxSearchLimit(), RETRIEVE_ID_ONLY);
            List<Long> ids = new ArrayList<>(hits.size());
            for (Map<String, Object> hit : hits) {
                Long id = toLong(hit.get("id"));
                if (id != null) {
                    ids.add(id);
                }
            }
            return Optional.of(ids);
        } catch (Exception e) {
            recordFallback("search", e);
            return Optional.empty();
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> executeSearch(String keyword, int limit, List<String> attributesToRetrieve) {
        // 1. 순수 초성(+숫자) 쿼리: ASCII 초성 전용 검색 (오타 허용 OFF)
        if (SearchTextNormalizer.isPureChosungQuery(keyword)) {
            String chosungQuery = SearchTextNormalizer.queryToChosungAscii(keyword);
            if (chosungQuery.isEmpty()) {
                return List.of();
            }
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("q", chosungQuery);
            body.put("limit", limit);
            body.put("matchingStrategy", "all");
            body.put("attributesToSearchOn", CHOSUNG_ATTRS);
            body.put("attributesToRetrieve", attributesToRetrieve);

            Map<String, Object> resp = client.searchSingle(body);
            return extractHits(resp);
        }

        // 2. 일반 한/영/혼합 쿼리: 단일 /multi-search로 [원문+동의어] + [QWERTY-자모] 동시 조회
        String qSplit = SearchTextNormalizer.tokenizeAndSplitKorNum(keyword);
        if (qSplit.isEmpty()) {
            return List.of();
        }

        List<Map<String, Object>> queries = new ArrayList<>(2);
        Map<String, Object> primaryQuery = new LinkedHashMap<>();
        primaryQuery.put("indexUid", client.getIndexName());
        primaryQuery.put("q", qSplit);
        primaryQuery.put("limit", limit);
        primaryQuery.put("matchingStrategy", "all");
        primaryQuery.put("showRankingScore", true);
        primaryQuery.put("rankingScoreThreshold", PRIMARY_SCORE_THRESHOLD);
        primaryQuery.put("attributesToSearchOn", PRIMARY_ATTRS);
        primaryQuery.put("attributesToRetrieve", attributesToRetrieve);
        queries.add(primaryQuery);

        boolean runQwerty = SearchTextNormalizer.hasHangul(qSplit)
                || SearchTextNormalizer.isPureLatinOrDigit(qSplit);
        if (runQwerty) {
            String qwertyQueryStr = SearchTextNormalizer.toQwertyJamo(qSplit);
            if (!qwertyQueryStr.isEmpty()) {
                Map<String, Object> qwertyQuery = new LinkedHashMap<>();
                qwertyQuery.put("indexUid", client.getIndexName());
                qwertyQuery.put("q", qwertyQueryStr);
                qwertyQuery.put("limit", limit);
                qwertyQuery.put("matchingStrategy", "all");
                qwertyQuery.put("showRankingScore", true);
                qwertyQuery.put("attributesToSearchOn", QWERTY_ATTRS);
                qwertyQuery.put("attributesToRetrieve", attributesToRetrieve);
                queries.add(qwertyQuery);
            }
        }

        Map<String, Object> multiResp = client.multiSearch(queries);
        if (multiResp == null || !(multiResp.get("results") instanceof List<?> results) || results.isEmpty()) {
            return List.of();
        }

        List<Map<String, Object>> primaryHits = extractHits((Map<String, Object>) results.get(0));
        List<Map<String, Object>> qwertyHits = results.size() > 1
                ? extractHits((Map<String, Object>) results.get(1))
                : List.of();

        return mergeHits(primaryHits, qwertyHits, limit);
    }

    private List<Map<String, Object>> mergeHits(
            List<Map<String, Object>> primaryHits,
            List<Map<String, Object>> qwertyHits,
            int limit
    ) {
        if (qwertyHits.isEmpty()) {
            return primaryHits.size() > limit ? primaryHits.subList(0, limit) : primaryHits;
        }
        if (primaryHits.isEmpty()) {
            return qwertyHits.size() > limit ? qwertyHits.subList(0, limit) : qwertyHits;
        }

        Map<Long, ScoredHit> merged = new LinkedHashMap<>();
        for (Map<String, Object> hit : primaryHits) {
            Long id = toLong(hit.get("id"));
            if (id != null) {
                double score = toDouble(hit.get("_rankingScore")) + PRIMARY_SCORE_BONUS;
                merged.put(id, new ScoredHit(hit, score));
            }
        }
        // 원문 검색 결과가 이미 있으면 고신뢰도(>=0.65) 오타/영타 보충 결과만 병합해 '피파'->'피자' 같은 짧은 단어 노이즈 방지
        for (Map<String, Object> hit : qwertyHits) {
            Long id = toLong(hit.get("id"));
            double score = toDouble(hit.get("_rankingScore"));
            if (id == null || score < SUPPLEMENT_QWERTY_THRESHOLD) {
                continue;
            }
            ScoredHit existing = merged.get(id);
            if (existing == null || score > existing.score()) {
                merged.put(id, new ScoredHit(hit, score));
            }
        }

        return merged.values().stream()
                .sorted(Comparator.comparingDouble(ScoredHit::score).reversed())
                .limit(limit)
                .map(ScoredHit::hit)
                .toList();
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> extractHits(Map<String, Object> response) {
        if (response == null || !(response.get("hits") instanceof List<?> hits)) {
            return List.of();
        }
        List<Map<String, Object>> list = new ArrayList<>(hits.size());
        for (Object item : hits) {
            if (item instanceof Map<?, ?> map) {
                list.add((Map<String, Object>) map);
            }
        }
        return list;
    }

    private Long toLong(Object val) {
        if (val instanceof Number n) {
            return n.longValue();
        }
        if (val instanceof String s) {
            try {
                return Long.parseLong(s);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private double toDouble(Object val) {
        return val instanceof Number n ? n.doubleValue() : 0.0;
    }

    private void recordFallback(String endpoint, Exception e) {
        log.warn("Meilisearch {} 실패 — MySQL 폴백 전환: {}", endpoint, e.getMessage());
        meterRegistry.counter("pstracker.search.fallback", "endpoint", endpoint).increment();
    }

    private record ScoredHit(Map<String, Object> hit, double score) {
    }
}
