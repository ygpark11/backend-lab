package com.pstracker.catalog_service.search;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Spring 내장 RestClient 기반 경량 Meilisearch HTTP 클라이언트.
 * - 검색용 클라이언트(짧은 타임아웃 200ms/400ms)와 색인용 클라이언트(2s/15s)를 분리해 장애 전파를 차단한다.
 */
@Slf4j
@Component
public class MeilisearchClient {

    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE = new ParameterizedTypeReference<>() {};

    private final MeilisearchProperties properties;
    private final RestClient searchClient;
    private final RestClient syncClient;

    public MeilisearchClient(MeilisearchProperties properties) {
        this.properties = properties;
        this.searchClient = buildClient(
                properties.getUrl(),
                properties.getMasterKey(),
                properties.getSearchConnectTimeoutMs(),
                properties.getSearchReadTimeoutMs()
        );
        this.syncClient = buildClient(
                properties.getUrl(),
                properties.getMasterKey(),
                properties.getSyncConnectTimeoutMs(),
                properties.getSyncReadTimeoutMs()
        );
    }

    private RestClient buildClient(String baseUrl, String masterKey, int connectTimeoutMs, int readTimeoutMs) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(connectTimeoutMs));
        factory.setReadTimeout(Duration.ofMillis(readTimeoutMs));

        RestClient.Builder builder = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE);

        if (StringUtils.hasText(masterKey)) {
            builder.defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + masterKey);
        }
        return builder.build();
    }

    public boolean isEnabled() {
        return properties.isEnabled();
    }

    public String getIndexName() {
        return properties.getIndexName();
    }

    public int getMaxSearchLimit() {
        return properties.getMaxSearchLimit();
    }

    public Map<String, Object> searchSingle(Map<String, Object> queryBody) {
        return searchClient.post()
                .uri("/indexes/{index}/search", properties.getIndexName())
                .body(queryBody)
                .retrieve()
                .body(MAP_TYPE);
    }

    public Map<String, Object> multiSearch(List<Map<String, Object>> queries) {
        return searchClient.post()
                .uri("/multi-search")
                .body(Map.of("queries", queries))
                .retrieve()
                .body(MAP_TYPE);
    }

    public void ensureIndexAndSettings(Map<String, Object> settings) {
        try {
            syncClient.post()
                    .uri("/indexes")
                    .body(Map.of("uid", properties.getIndexName(), "primaryKey", "id"))
                    .retrieve()
                    .toBodilessEntity();
        } catch (HttpClientErrorException e) {
            // 이미 인덱스가 존재하거나 생성 태스크가 등록된 경우 무시
            log.debug("Meilisearch index create response ({}): {}", e.getStatusCode(), e.getResponseBodyAsString());
        }

        syncClient.patch()
                .uri("/indexes/{index}/settings", properties.getIndexName())
                .body(settings)
                .retrieve()
                .toBodilessEntity();
    }

    public void upsertDocuments(List<GameSearchDocument> documents) {
        if (documents == null || documents.isEmpty()) {
            return;
        }
        syncClient.post()
                .uri("/indexes/{index}/documents?primaryKey=id", properties.getIndexName())
                .body(documents)
                .retrieve()
                .toBodilessEntity();
    }

    public void deleteDocument(Long gameId) {
        if (gameId == null) {
            return;
        }
        syncClient.delete()
                .uri("/indexes/{index}/documents/{id}", properties.getIndexName(), gameId)
                .retrieve()
                .toBodilessEntity();
    }

    public void deleteDocuments(List<Long> gameIds) {
        if (gameIds == null || gameIds.isEmpty()) {
            return;
        }
        syncClient.post()
                .uri("/indexes/{index}/documents/delete-batch", properties.getIndexName())
                .body(gameIds)
                .retrieve()
                .toBodilessEntity();
    }

    public long getDocumentCount() {
        try {
            Map<String, Object> stats = syncClient.get()
                    .uri("/indexes/{index}/stats", properties.getIndexName())
                    .retrieve()
                    .body(MAP_TYPE);
            if (stats == null || stats.get("numberOfDocuments") == null) {
                return 0L;
            }
            return ((Number) stats.get("numberOfDocuments")).longValue();
        } catch (HttpClientErrorException.NotFound e) {
            return 0L;
        }
    }
}
