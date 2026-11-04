package com.pstracker.catalog_service.catalog.service;

import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.repository.GameRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SitemapServiceTest {

    @Autowired
    private SitemapService sitemapService;

    @Autowired
    private GameRepository gameRepository;

    @Test
    @DisplayName("모든 게임의 상세 페이지 URL을 sitemap 형식으로 생성한다")
    void buildGamesSitemap_containsAllGameUrls() {
        Long firstId = gameRepository.save(createGame("SITEMAP-001")).getId();
        Long secondId = gameRepository.save(createGame("SITEMAP-002")).getId();

        String xml = sitemapService.buildGamesSitemap();

        assertThat(xml).startsWith("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        assertThat(xml).contains("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">");
        assertThat(xml).contains("<loc>https://ps-signal.com/games/" + firstId + "</loc>");
        assertThat(xml).contains("<loc>https://ps-signal.com/games/" + secondId + "</loc>");
        assertThat(xml).doesNotContain("<lastmod>");
        assertThat(xml).endsWith("</urlset>\n");
    }

    private Game createGame(String psStoreId) {
        return Game.create(psStoreId, "Sitemap Game", "Sitemap Game",
                "Publisher", "http://img.com", "Description", LocalDate.of(2024, 1, 1));
    }
}
