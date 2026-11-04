package com.pstracker.catalog_service.catalog.service;

import com.pstracker.catalog_service.catalog.repository.GameRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 게임 상세 페이지(/games/{id}) 검색엔진용 sitemap 생성.
 * lastmod는 넣지 않는다: lastUpdated는 가격 변동이 없어도 매일 갱신되어 Google이 신뢰하지 않는 값이 됨.
 */
@Service
@RequiredArgsConstructor
public class SitemapService {

    private final GameRepository gameRepository;

    @Value("${app.base-url:https://ps-signal.com}")
    private String baseUrl;

    @Transactional(readOnly = true)
    public String buildGamesSitemap() {
        List<Long> gameIds = gameRepository.findAllIds();

        StringBuilder sb = new StringBuilder(64 + gameIds.size() * 64);
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        sb.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
        for (Long id : gameIds) {
            sb.append("  <url><loc>").append(baseUrl).append("/games/").append(id).append("</loc></url>\n");
        }
        sb.append("</urlset>\n");
        return sb.toString();
    }
}
