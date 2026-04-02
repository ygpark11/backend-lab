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

import java.text.Normalizer;
import java.util.List;

import static org.springframework.util.StringUtils.hasText;

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
    private String accessToken;

    private void refreshAccessToken() {
        try {
            log.debug("Requesting new IGDB Access Token...");
            IgdbAuthResponse response = restClient.post()
                    .uri(authUrl + "?client_id={clientId}&client_secret={clientSecret}&grant_type=client_credentials",
                            clientId, clientSecret)
                    .retrieve()
                    .body(IgdbAuthResponse.class);

            if (response != null && response.accessToken() != null) {
                this.accessToken = response.accessToken();
                log.info("IGDB Token acquired! Expires in: {}s", response.expiresIn());
            }
        } catch (Exception e) {
            log.error("Failed to get IGDB token", e);
            throw new RuntimeException("IGDB Auth Failed");
        }
    }

    public IgdbGameResponse searchGame(String gameTitle) {
        if (this.accessToken == null) refreshAccessToken();
        IgdbGameResponse result = null;

        // 1. 인코딩 찌꺼기 및 구두점만 제거 (에디션 등 원본 유지)
        String stage1Title = cleanMojibakeOnly(gameTitle);
        if (hasText(stage1Title)) {
            result = searchByName(stage1Title, "[Stage 1] Exact/Edition Search");
            if (result != null) return result;
        }

        // 2. 2차 정규화 (에디션, 플랫폼, 마케팅 용어 제거)
        String stage2Title = normalizeAggressive(stage1Title);
        // Stage1과 결과가 다를 때만(무언가 잘려 나갔을 때만) 검색 시도 (네트워크 낭비 방지)
        if (hasText(stage2Title) && !stage2Title.equals(stage1Title)) {
            result = searchByName(stage2Title, "[Stage 2] Normalized Search");
            if (result != null) return result;
        }

        // 3. 핵심 타이틀만 추출
        String rawCoreTitle = extractCoreTitle(gameTitle);
        // 잘라낸 뼈대 문자열을 다시 깨끗하게 정규화
        String stage3Title = normalizeAggressive(cleanMojibakeOnly(rawCoreTitle));

        if (hasText(stage3Title) && !stage3Title.equals(stage2Title)) {
            result = searchByName(stage3Title, "[Stage 3] Core Keyword Search");
        }

        if (result == null) {
            log.warn("FAILED ALL 3 STAGES: Raw='{}', Stage3='{}'", gameTitle, stage3Title);
        }

        return result;
    }

    private IgdbGameResponse searchByName(String title, String logPrefix) {
        String cleanTitle = title.replace("\"", "");
        String query = String.format(
                "fields name, aggregated_rating, aggregated_rating_count, rating, rating_count, summary, total_rating_count;" +
                        "search \"%s\";" +
                        "limit 10;",
                cleanTitle
        );
        return executeQuery(query, logPrefix + ": " + cleanTitle);
    }

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
                return responses.stream()
                        .sorted((g1, g2) -> {
                            int count1 = (g1.totalRatingCount() == null) ? 0 : g1.totalRatingCount();
                            int count2 = (g2.totalRatingCount() == null) ? 0 : g2.totalRatingCount();
                            return Integer.compare(count2, count1); // 리뷰 수 내림차순
                        })
                        .findFirst()
                        .orElse(responses.get(0));
            }
        } catch (Exception e) {
            log.warn("IGDB Error [{}]: {}", logPrefix, e.getMessage());
        }
        return null;
    }

    private String cleanMojibakeOnly(String rawTitle) {
        if (!hasText(rawTitle)) return "";
        return rawTitle
                .replaceAll("[Â„€“„€“]", " ") // 로그에 등장한 괴상한 문자들
                .replaceAll("YEAH! YOU WANT \\\\", "")
                .replaceAll("â€™", "'")
                .replaceAll("â¢", "")
                .replaceAll("[™®©]", "")
                .replaceAll("＆", "&")
                .replaceAll("[:\\-,&\\+–]", " ")
                .replaceAll("\\s+", " ").strip(); // 다중 공백을 단일 공백으로 압축
    }

    private String normalizeAggressive(String title) {
        if (!hasText(title)) return "";

        // 악센트 제거 (Ragnarök -> Ragnarok)
        String result = Normalizer.normalize(title, Normalizer.Form.NFD).replaceAll("\\p{M}", "");

        result = result
                .replaceAll("\\(.*?\\)", "") // (한국어판) 등 제거
                .replaceAll("\\[.*?\\]", "")
                .replaceAll("(?i)\\b(PS4|PS5|PS\\s?VR2|PS\\s?VR)\\b", "")
                .replaceAll("(?i)PlayStation\\s*Hits", "")
                .replaceAll("(?i)\\b(demo|trial|full game|pack|bundle)\\b", "")
                .replaceAll("(?i)\\b((standard|deluxe|ultimate|premium|collector's|complete|digital|director's|game of the year|goty|cross-gen|launch|special|anniversary|sound|anime|music|bgm|gold|silver|platinum|definitive|expanded|master|legacy|galactic|unlimited|championship|contribution|franchise|evolved|extras|year\\s*\\d+|ragnarok|valhalla|sinful|ritual|rebuild|deadman)\\s*)+(edition|cut|ver|version|bundle|pack|set|collection|anthology)\\b", "")
                .replaceAll("(?i)\\b(remastered|remaster|collection)\\b", "")
                .replaceAll("(?i)\\b(digital|deluxe|premium|standard|ultimate|anniversary|gold|silver|platinum|definitive|expanded|master|legacy|galactic|unlimited|championship|contribution|franchise|evolved|extras|sinful|ritual|rebuild|deadman)\\s*$", "")
                .replaceAll("[:\\-,&\\+]", " ")
                .replaceAll("\\s+", " ").strip();

        return result;
    }

    private String extractCoreTitle(String title) {
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