package com.pstracker.catalog_service.catalog.infrastructure;

import com.pstracker.catalog_service.catalog.dto.igdb.IgdbAuthResponse;
import com.pstracker.catalog_service.catalog.dto.igdb.IgdbGameResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Component
@RequiredArgsConstructor
public class IgdbApiClient {

    @Value("${igdb.client-id}")
    private String clientId;

    @Value("${igdb.client-secret}")
    private String clientSecret;

    @Value("${igdb.auth-url}")
    private String authUrl;

    @Value("${igdb.api-url}")
    private String apiUrl;

    private final RestClient restClient = RestClient.create();
    private String accessToken; // 메모리에 토큰 캐싱

    // ID 추출 정규식
    private static final Pattern PSN_ID_PATTERN = Pattern.compile("(PPSA|CUSA)\\d{5}_\\d{2}");

    /**
     * [Step 1] 트위치 서버에서 액세스 토큰 발급
     */
    private void refreshAccessToken() {
        try {
            log.info("🔑 Requesting new IGDB Access Token...");
            IgdbAuthResponse response = restClient.post()
                    .uri(authUrl + "?client_id={clientId}&client_secret={clientSecret}&grant_type=client_credentials",
                            clientId, clientSecret)
                    .retrieve()
                    .body(IgdbAuthResponse.class);

            if (response != null && response.accessToken() != null) {
                this.accessToken = response.accessToken();
                log.info("✅ IGDB Token acquired! Expires in: {}s", response.expiresIn());
            }
        } catch (Exception e) {
            log.error("❌ Failed to get IGDB token", e);
            throw new RuntimeException("IGDB Auth Failed");
        }
    }

    /**
     * [Step 2] 게임 이름으로 평점 검색
     */
    public IgdbGameResponse searchGame(String psStoreId, String gameTitle) {
        if (this.accessToken == null) {
            refreshAccessToken();
        }

        IgdbGameResponse result = null;

        // 1. ID로 검색 (정확도 100% 보장되는 경우만)
        String coreId = extractCoreId(psStoreId);
        if (coreId != null) {
            String queryById = String.format(
                    "fields name, aggregated_rating, aggregated_rating_count, rating, rating_count, summary;" +
                            "where external_games.uid = \"%s\" & external_games.category = 36;" +
                            "limit 1;",
                    coreId
            );
            result = executeQuery(queryById, "ID Search: " + coreId);
        }

        // 2. 이름으로 검색 (ID 실패 시)
        // 불확실한 슬러그 검색은 제거함. 오직 제목으로만 승부.
        if (result == null && gameTitle != null) {
            String cleanTitle = gameTitle.replace("\"", ""); // 문법 오류 방지용 최소 정제
            String queryByName = String.format(
                    "fields name, aggregated_rating, aggregated_rating_count, rating, rating_count, summary;" +
                            "search \"%s\"; limit 1;",
                    cleanTitle
            );
            result = executeQuery(queryByName, "Name Search: " + cleanTitle);
        }

        return result;
    }

    /**
     * IGDB API 쿼리 실행 공통 로직
     */
    private IgdbGameResponse executeQuery(String queryBody, String logPrefix) {
        try {
            List<IgdbGameResponse> responses = restClient.post()
                    .uri(apiUrl + "/games")
                    .header("Client-ID", clientId)
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.TEXT_PLAIN)
                    .body(queryBody)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});

            if (responses != null && !responses.isEmpty()) {
                IgdbGameResponse hit = responses.get(0);
                // 검색 결과가 너무 엉뚱한 것(유사도 낮은 것)을 걸러내는 로직은 추후 고도화 가능
                log.info("🎯 IGDB Hit [{}]: {} (Meta: {})", logPrefix, hit.name(), hit.criticScore());
                return hit;
            }
        } catch (Exception e) {
            log.warn("⚠️ IGDB Error [{}]: {}", logPrefix, e.getMessage());
        }
        return null;
    }

    /**
     * PSN Store ID에서 핵심 ID 부분만 추출
     * @param rawId 원본 PSN Store ID
     * @return 핵심 ID (예: CUSA12345_00) 또는 null
     */
    private String extractCoreId(String rawId) {
        if (rawId == null) return null;
        Matcher matcher = PSN_ID_PATTERN.matcher(rawId);
        if (matcher.find()) {
            return matcher.group();
        }
        return null;
    }
}
