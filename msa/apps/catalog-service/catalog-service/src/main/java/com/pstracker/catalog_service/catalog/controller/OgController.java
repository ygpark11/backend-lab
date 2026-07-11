package com.pstracker.catalog_service.catalog.controller;

import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.repository.GameRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.HtmlUtils;

import java.util.Locale;

@RestController
@RequestMapping("/api/og")
@RequiredArgsConstructor
public class OgController {

    private final GameRepository gameRepository;

    @GetMapping(value = "/game/{gameId}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> getGameOgPage(@PathVariable Long gameId) {
        return gameRepository.findById(gameId)
                .map(game -> ResponseEntity.ok()
                        .contentType(MediaType.TEXT_HTML)
                        .body(buildOgHtml(game)))
                .orElse(ResponseEntity.notFound().<String>build());
    }

    private String buildOgHtml(Game game) {
        String title     = HtmlUtils.htmlEscape(buildTitle(game));
        String desc      = HtmlUtils.htmlEscape(buildDescription(game));
        String imageUrl  = HtmlUtils.htmlEscape(game.getImageUrl() != null ? game.getImageUrl() : "");
        String canonical = "https://ps-signal.com/games/" + game.getId();

        return """
                <!DOCTYPE html>
                <html lang="ko">
                <head>
                  <meta charset="UTF-8">
                  <title>%s</title>
                  <meta property="og:type"        content="website"/>
                  <meta property="og:url"         content="%s"/>
                  <meta property="og:title"       content="%s"/>
                  <meta property="og:description" content="%s"/>
                  <meta property="og:image"       content="%s"/>
                  <meta property="og:site_name"   content="PS-Tracker"/>
                  <meta name="twitter:card"        content="summary_large_image"/>
                  <meta name="twitter:title"       content="%s"/>
                  <meta name="twitter:description" content="%s"/>
                  <meta name="twitter:image"       content="%s"/>
                  <meta http-equiv="refresh" content="0; url=%s"/>
                </head>
                <body></body>
                </html>
                """.formatted(title, canonical, title, desc, imageUrl, title, desc, imageUrl, canonical);
    }

    private String buildTitle(Game game) {
        StringBuilder sb = new StringBuilder(game.getName() != null ? game.getName() : "");
        Integer price = game.getCurrentPrice();
        Integer discount = game.getDiscountRate();

        if (price != null && price > 0) {
            sb.append(" | ₩").append(String.format(Locale.US, "%,d", price));
        }
        if (discount != null && discount > 0) {
            sb.append(" (").append(discount).append("% 할인)");
        }
        sb.append(" | PS-Tracker");
        return sb.toString();
    }

    private String buildDescription(Game game) {
        StringBuilder sb = new StringBuilder();

        // 역대최저가 여부 — 할인 중이면서 현재가 == 역대최저가
        boolean isAllTimeLow = game.getDiscountRate() != null && game.getDiscountRate() > 0
                && game.getCurrentPrice() != null && game.getAllTimeLowPrice() != null
                && game.getCurrentPrice().equals(game.getAllTimeLowPrice());

        if (isAllTimeLow) {
            sb.append("역대최저가 달성! ");
        }

        String rawDesc = game.getDescription();
        if (rawDesc != null && !rawDesc.isBlank() && !"Full Data Crawler".equals(rawDesc)) {
            // HTML 태그 제거 후 120자 제한
            String stripped = rawDesc.replaceAll("<[^>]+>", "").strip();
            sb.append(stripped.length() > 120 ? stripped.substring(0, 120) + "…" : stripped);
        } else {
            sb.append("PS-Tracker에서 가격을 추적 중인 게임입니다.");
        }

        return sb.toString();
    }
}
