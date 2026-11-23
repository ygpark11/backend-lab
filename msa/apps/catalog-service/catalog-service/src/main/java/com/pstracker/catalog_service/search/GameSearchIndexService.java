package com.pstracker.catalog_service.search;

import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.repository.GameRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Meilisearch 인덱스 설정 및 MySQL -> Meilisearch 동기화 서비스.
 * - DB 트랜잭션을 점유하지 않도록 문서 변환 후 HTTP 배치 전송을 수행한다.
 * - 장애 발생 시 예외를 상위로 전파하지 않고 경고 로그만 남겨 핵심 도메인 흐름을 보호한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GameSearchIndexService {

    private static final int BATCH_SIZE = 500;

    private final MeilisearchClient client;
    private final GameRepository gameRepository;

    /**
     * 앱 기동 완료 시 비동기로 인덱스 설정을 보장하고, 문서가 비어 있으면 초기 전체 색인을 수행한다.
     */
    @Async
    @EventListener(ApplicationReadyEvent.class)
    public void initializeIfEmpty() {
        if (!client.isEnabled()) {
            return;
        }
        try {
            client.ensureIndexAndSettings(buildIndexSettings());
            long count = client.getDocumentCount();
            if (count == 0) {
                log.info("Meilisearch 인덱스가 비어 있어 초기 전체 색인을 시작합니다.");
                reindexAll();
            } else {
                log.info("Meilisearch 인덱스 준비 완료 (기존 색인 문서: {}건)", count);
            }
        } catch (Exception e) {
            log.warn("Meilisearch 초기화 실패 (서비스는 MySQL 폴백으로 정상 동작): {}", e.getMessage());
        }
    }

    /**
     * MySQL 전체 게임을 Meilisearch로 일괄 업서트한다. (설정 동기화 포함)
     * 3,600여 건 기준 약 1~2초 소요.
     */
    public int reindexAll() {
        if (!client.isEnabled()) {
            log.info("Meilisearch가 비활성화 상태라 reindexAll을 건너뜁니다.");
            return 0;
        }
        long start = System.currentTimeMillis();
        client.ensureIndexAndSettings(buildIndexSettings());

        List<GameSearchDocument> documents = gameRepository.findAll().stream()
                .map(GameSearchDocument::from)
                .toList();

        for (int i = 0; i < documents.size(); i += BATCH_SIZE) {
            int end = Math.min(i + BATCH_SIZE, documents.size());
            client.upsertDocuments(documents.subList(i, end));
        }

        long elapsed = System.currentTimeMillis() - start;
        log.info("Meilisearch 전체 색인 요청 완료: {}건 ({}ms)", documents.size(), elapsed);
        return documents.size();
    }

    public void syncByIds(List<Long> gameIds) {
        if (!client.isEnabled() || gameIds == null || gameIds.isEmpty()) {
            return;
        }
        try {
            List<GameSearchDocument> docs = gameRepository.findAllById(gameIds).stream()
                    .map(GameSearchDocument::from)
                    .toList();
            if (!docs.isEmpty()) {
                client.upsertDocuments(docs);
                log.debug("Meilisearch 증분 업서트 완료: {}건", docs.size());
            }
        } catch (Exception e) {
            log.warn("Meilisearch 증분 업서트 실패 (gameIds={}): {}", gameIds, e.getMessage());
        }
    }

    public void syncGames(List<Game> games) {
        if (!client.isEnabled() || games == null || games.isEmpty()) {
            return;
        }
        try {
            List<GameSearchDocument> docs = games.stream()
                    .filter(g -> g.getId() != null)
                    .map(GameSearchDocument::from)
                    .toList();
            if (!docs.isEmpty()) {
                client.upsertDocuments(docs);
                log.debug("Meilisearch 배치 업서트 완료: {}건", docs.size());
            }
        } catch (Exception e) {
            log.warn("Meilisearch 배치 업서트 실패 ({}건): {}", games.size(), e.getMessage());
        }
    }

    public void deleteByIds(List<Long> gameIds) {
        if (!client.isEnabled() || gameIds == null || gameIds.isEmpty()) {
            return;
        }
        try {
            if (gameIds.size() == 1) {
                client.deleteDocument(gameIds.get(0));
            } else {
                client.deleteDocuments(gameIds);
            }
            log.debug("Meilisearch 문서 삭제 완료: {}건", gameIds.size());
        } catch (Exception e) {
            log.warn("Meilisearch 문서 삭제 실패 (gameIds={}): {}", gameIds, e.getMessage());
        }
    }

    static Map<String, Object> buildIndexSettings() {
        Map<String, Object> settings = new LinkedHashMap<>();
        settings.put("searchableAttributes", List.of(
                "name", "englishName", "searchKeywords", "qwertyText", "chosungAscii"
        ));
        settings.put("rankingRules", List.of(
                "words", "typo", "proximity", "attribute", "sort", "exactness", "popularity:desc"
        ));
        settings.put("sortableAttributes", List.of("popularity"));
        settings.put("typoTolerance", Map.of(
                "enabled", true,
                "minWordSizeForTypos", Map.of("oneTypo", 4, "twoTypos", 8),
                "disableOnAttributes", List.of("chosungAscii")
        ));
        settings.put("separatorTokens", List.of("'", "’", ":", "-", "–", "—", "/", "&", "™", "®"));
        settings.put("synonyms", buildSynonyms());
        return settings;
    }

    private static Map<String, List<String>> buildSynonyms() {
        Map<String, List<String>> base = new LinkedHashMap<>();
        // PS 스토어 에디션/버전 한영 동의어
        base.put("컴플리트", List.of("complete", "completed"));
        base.put("complete", List.of("컴플리트"));
        base.put("디럭스", List.of("deluxe", "딜럭스"));
        base.put("딜럭스", List.of("deluxe", "디럭스"));
        base.put("deluxe", List.of("디럭스", "딜럭스"));
        base.put("얼티밋", List.of("ultimate"));
        base.put("ultimate", List.of("얼티밋"));
        base.put("리마스터", List.of("remastered", "remaster", "리마스터드"));
        base.put("리마스터드", List.of("remastered", "remaster", "리마스터"));
        base.put("remastered", List.of("리마스터", "리마스터드", "remaster"));
        base.put("리메이크", List.of("remake"));
        base.put("remake", List.of("리메이크"));
        base.put("골드", List.of("gold"));
        base.put("gold", List.of("골드"));
        base.put("고티", List.of("goty"));
        base.put("goty", List.of("고티"));
        base.put("스탠다드", List.of("standard"));
        base.put("standard", List.of("스탠다드"));
        base.put("디렉터스", List.of("director", "directors"));
        base.put("디렉터스컷", List.of("director cut", "directors cut"));
        base.put("트릴로지", List.of("trilogy"));
        base.put("trilogy", List.of("트릴로지"));
        base.put("컬렉션", List.of("collection"));
        base.put("collection", List.of("컬렉션"));
        base.put("번들", List.of("bundle"));
        base.put("bundle", List.of("번들"));
        base.put("에디션", List.of("edition"));
        base.put("edition", List.of("에디션"));
        base.put("파트", List.of("part"));
        base.put("part", List.of("파트"));
        // 주요 시리즈 한영 동의어
        base.put("파이널", List.of("final"));
        base.put("판타지", List.of("fantasy"));
        base.put("파이널판타지", List.of("final fantasy", "파판"));
        base.put("파판", List.of("final fantasy", "파이널판타지"));
        base.put("바이오하자드", List.of("resident evil", "biohazard", "바하"));
        base.put("바하", List.of("resident evil", "biohazard", "바이오하자드"));
        base.put("어쌔신", List.of("assassin", "assassins"));
        base.put("크리드", List.of("creed"));
        base.put("스파이더맨", List.of("spider man"));
        base.put("호라이즌", List.of("horizon"));
        base.put("위쳐", List.of("witcher"));
        base.put("엘든링", List.of("elden ring"));
        base.put("몬스터헌터", List.of("monster hunter", "몬헌"));
        base.put("몬헌", List.of("monster hunter", "몬스터헌터"));
        // 로마숫자 <-> 아라비아숫자
        base.put("2", List.of("ii")); base.put("ii", List.of("2"));
        base.put("3", List.of("iii")); base.put("iii", List.of("3"));
        base.put("4", List.of("iv")); base.put("iv", List.of("4"));
        base.put("5", List.of("v")); base.put("v", List.of("5"));
        base.put("6", List.of("vi")); base.put("vi", List.of("6"));
        base.put("7", List.of("vii")); base.put("vii", List.of("7"));
        base.put("8", List.of("viii")); base.put("viii", List.of("8"));
        base.put("9", List.of("ix")); base.put("ix", List.of("9"));
        base.put("10", List.of("x")); base.put("x", List.of("10"));
        base.put("16", List.of("xvi")); base.put("xvi", List.of("16"));

        Map<String, List<String>> expanded = new LinkedHashMap<>();
        for (Map.Entry<String, List<String>> entry : base.entrySet()) {
            String key = entry.getKey().toLowerCase();
            Set<String> values = new LinkedHashSet<>();
            for (String v : entry.getValue()) {
                values.add(v.toLowerCase());
            }

            String qwertyKey = SearchTextNormalizer.toQwertyJamo(key);
            Set<String> qwertyValues = new LinkedHashSet<>();
            for (String v : entry.getValue()) {
                qwertyValues.add(SearchTextNormalizer.toQwertyJamo(v));
            }

            if (!qwertyKey.equals(key)) {
                expanded.put(key, new ArrayList<>(values));
                expanded.put(qwertyKey, new ArrayList<>(qwertyValues));
            } else {
                values.addAll(qwertyValues);
                expanded.put(key, new ArrayList<>(values));
            }
        }
        return expanded;
    }
}
