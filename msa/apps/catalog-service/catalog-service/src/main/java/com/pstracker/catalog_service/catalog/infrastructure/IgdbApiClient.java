package com.pstracker.catalog_service.catalog.infrastructure;

import com.pstracker.catalog_service.catalog.dto.igdb.IgdbAuthResponse;
import com.pstracker.catalog_service.catalog.dto.igdb.IgdbGameResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.text.Normalizer;
import java.util.List;
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
    public IgdbGameResponse searchGame(String gameTitle) {
        if (this.accessToken == null) {
            refreshAccessToken();
        }

        IgdbGameResponse result = null;

        // 1. 정규화된 이름으로 검색
        String normalizedTitle = normalizeTitle(gameTitle);
        if (StringUtils.hasText(normalizedTitle)) {
            result = searchByName(normalizedTitle, "🔍 [1차] Normalized Search");
            if (result != null) return result;
        }

        // 2. "핵심 키워드"만 잘라서 재검색 (부제, 에디션 불일치 해결용)
        // 예: "Tales of Arise - Beyond the Dawn" -> "Tales of Arise"
        String simpleTitle = extractMainTitle(gameTitle);
        if (StringUtils.hasText(simpleTitle) && !simpleTitle.equals(normalizedTitle)) {
            result = searchByName(simpleTitle, "🔥 [2차] Simple Keyword Search");
        }

        if (result == null) {
            log.warn("❌ FAILED ALL: Raw='{}'", gameTitle);
        }

        return result;
    }

    private IgdbGameResponse searchByName(String title, String logPrefix) {
        String cleanTitle = title.replace("\"", "");
        // 넉넉하게 10개 요청해서 '리뷰 수'로 정렬
        String query = String.format(
                "fields name, aggregated_rating, aggregated_rating_count, rating, rating_count, summary, total_rating_count;" +
                        "search \"%s\";" +
                        "limit 10;",
                cleanTitle
        );
        return executeQuery(query, logPrefix + ": " + cleanTitle);
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

                // ... 기존 정렬 및 선택 로직 ...
                IgdbGameResponse bestMatch = responses.stream()
                        .sorted((g1, g2) -> {
                            int count1 = (g1.totalRatingCount() == null) ? 0 : g1.totalRatingCount();
                            int count2 = (g2.totalRatingCount() == null) ? 0 : g2.totalRatingCount();

                            // 2. 리뷰 수 내림차순 정렬 (298 > 11 > 10 > 0)
                            return Integer.compare(count2, count1);
                        })
                        .findFirst()
                        .orElse(responses.get(0));

                return bestMatch;
            }
        } catch (Exception e) {
            log.warn("⚠️ IGDB Error [{}]: {}", logPrefix, e.getMessage());
            e.printStackTrace();
        }
        return null;
    }

    /**
     * [제목 자르기] 콜론(:), 하이픈(-), 붙임표(–) 기준으로 제목을 자르고
     * 메인 타이틀 부분만 반환합니다.
     * 예: "Gran Turismo™ 7: Deluxe Edition" -> "Gran Turismo 7"
     */
    private String extractMainTitle(String rawTitle) {
        if (!StringUtils.hasText(rawTitle)) return "";
        // 콜론(:), 하이픈(-), 붙임표(–) 기준으로 자름
        String[] parts = rawTitle.split("[:\\-–]");
        if (parts.length > 0) {
            String mainPart = parts[0].trim();
            // 너무 짧으면(2글자 이하) 검색 위험하므로 제외 (예: "GT: Sport" -> "GT"는 위험)
            if (mainPart.length() >= 3) {
                return normalizeTitle(mainPart); // 자른 것도 정규화 한번 태움 (특문 제거)
            }
        }
        return "";
    }

    /**
     * [제목 정규화] 검색 정확도를 높이기 위해 불필요한 노이즈를 제거합니다.
     * 예: "철권 8 (중국어(간체자), 한국어)" -> "철권 8"
     * 예: "Gran Turismo™ 7" -> "Gran Turismo 7"
     */
    private String normalizeTitle(String rawTitle) {
        if (!StringUtils.hasText(rawTitle)) return "";

        String result = rawTitle.strip();

        // 0. 악센트 제거 (Ragnarök -> Ragnarok)
        result = Normalizer.normalize(result, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");

        result = result
                // 1. 인코딩/전각 문자 정리
                .replaceAll("â€™", "'")
                .replaceAll("â¢", "")
                .replaceAll("[™®]", "")
                .replaceAll("＆", "&")

                // 2. 괄호/대괄호 제거
                .replaceAll("\\(.*?\\)", "")
                .replaceAll("\\[.*?\\]", "")

                // 3. 플랫폼/데모 제거
                .replaceAll("(?i)\\b(PS4|PS5|PS\\s?VR2|PS\\s?VR)\\b", "")
                .replaceAll("(?i)PlayStation\\s*Hits", "")
                .replaceAll("(?i)\\b(demo|trial)\\b", "")

                // 4. [업데이트] 에디션 키워드 추가 (sinful, ritual, rebuild, deadman)
                // sinful, ritual 등이 추가되어 "Sinful Edition" 패턴이 삭제됩니다.
                .replaceAll("(?i)\\b((standard|deluxe|ultimate|premium|collector's|complete|digital|director's|game of the year|goty|cross-gen|launch|special|anniversary|sound|anime|music|bgm|gold|silver|platinum|definitive|expanded|master|legacy|galactic|unlimited|championship|contribution|franchise|evolved|extras|year\\s*\\d+|ragnarok|valhalla|sinful|ritual|rebuild|deadman)\\s*)+(edition|cut|ver|version|bundle|pack|set|collection|anthology)\\b", "")

                // 4-1. 잔여 형용사 정리
                .replaceAll("(?i)\\b(digital|deluxe|premium|standard|ultimate|anniversary|gold|silver|platinum|definitive|expanded|master|legacy|galactic|unlimited|championship|contribution|franchise|evolved|extras|sinful|ritual|rebuild|deadman)\\s*$", "")

                // 5. 구두점 정리
                .replaceAll("[:\\-,&\\+]", " ")

                // 6. 공백 정리
                .replaceAll("\\s+", " ").strip();

        return result;
    }
}
