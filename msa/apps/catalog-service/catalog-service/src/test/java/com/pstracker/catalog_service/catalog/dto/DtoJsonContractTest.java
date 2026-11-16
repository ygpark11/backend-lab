package com.pstracker.catalog_service.catalog.dto;

import com.pstracker.catalog_service.arcade.dto.ScoreSubmitResponse;
import com.pstracker.catalog_service.subscription.dto.PsPlusPricingResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class DtoJsonContractTest {

    private final ObjectMapper objectMapper = JsonMapper.builder().build();

    @Test
    @DisplayName("Jackson 3에서 GameSearchResponse record가 기존 JSON 키 계약을 유지한다")
    void gameSearchResponse_preservesJsonContract() {
        GameSearchResponse dto = new GameSearchResponse(
                1L, "Test", "img",
                50000, 25000, 50,
                true, LocalDate.of(2026, 12, 31), "pioneer",
                true, LocalDateTime.of(2026, 1, 1, 0, 0),
                true, 1, 2,
                90, null, List.of("#액션"),
                25000, true
        ).withEnriched(List.of("Action"), true, "BUY_NOW");

        JsonNode node = objectMapper.readTree(objectMapper.writeValueAsString(dto));

        assertThat(node.has("isPlusExclusive")).isTrue();
        assertThat(node.get("isPlusExclusive").asBoolean()).isTrue();
        assertThat(node.has("inCatalog")).isTrue();
        assertThat(node.has("isPs5ProEnhanced")).isTrue();
        assertThat(node.has("isAllTimeLowNew")).isTrue();
        assertThat(node.get("displayScore").asInt()).isEqualTo(90);
        assertThat(node.get("scoreSource").asString()).isEqualTo("MC");
        assertThat(node.get("topVibeTag").asString()).isEqualTo("#액션");
    }

    @Test
    @DisplayName("Jackson 3에서 WishlistResponse, ScoreSubmitResponse, PsPlusPricingResponse가 기존 boolean 키를 유지한다")
    void booleanFieldJsonKeys_preservedInJackson3() {
        WishlistResponse wish = new WishlistResponse(
                1L, 10L, "Game", "img",
                50000, 25000, 50, 20000,
                true, LocalDate.of(2026, 12, 31),
                85, 8.0, null, null, 10.0,
                true, "pioneer",
                LocalDateTime.now(), LocalDateTime.now(),
                true, List.of("#스토리"), false
        ).withEnriched(List.of("RPG"), "GOOD_OFFER");

        JsonNode wishNode = objectMapper.readTree(objectMapper.writeValueAsString(wish));
        assertThat(wishNode.get("onSale").asBoolean()).isTrue();
        assertThat(wishNode.get("isPlusExclusive").asBoolean()).isTrue();
        assertThat(wishNode.get("inCatalog").asBoolean()).isTrue();

        ScoreSubmitResponse score = ScoreSubmitResponse.builder()
                .success(true).isNewHighScore(true).rank(1).score(1000).message("ok").build();
        JsonNode scoreNode = objectMapper.readTree(objectMapper.writeValueAsString(score));
        assertThat(scoreNode.get("newHighScore").asBoolean()).isTrue();

        PsPlusPricingResponse pricing = new PsPlusPricingResponse(true, 30, Map.of(), Map.of());
        JsonNode pricingNode = objectMapper.readTree(objectMapper.writeValueAsString(pricing));
        assertThat(pricingNode.get("promotionActive").asBoolean()).isTrue();
    }

    @Test
    @DisplayName("Jackson 3에서 CollectRequest record가 기존 크롤러 JSON 역직렬화를 지원한다")
    void collectRequest_deserializesFromCrawlerPayload() {
        String payload = """
                {
                  "psStoreId": "PPSA-001",
                  "title": "Test Game",
                  "originalPrice": 69800,
                  "currentPrice": 34900,
                  "discountRate": 50,
                  "saleEndDate": "2026-12-31",
                  "isPlusExclusive": true,
                  "inCatalog": true,
                  "isPs5ProEnhanced": true
                }
                """;

        CollectRequest req = objectMapper.readValue(payload, CollectRequest.class);

        assertThat(req.psStoreId()).isEqualTo("PPSA-001");
        assertThat(req.isPlusExclusive()).isTrue();
        assertThat(req.inCatalog()).isTrue();
        assertThat(req.isPs5ProEnhanced()).isTrue();
        assertThat(req.saleEndDate()).isEqualTo(LocalDate.of(2026, 12, 31));
    }
}
