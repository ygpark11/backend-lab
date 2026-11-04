package com.pstracker.catalog_service.catalog.controller;

import com.pstracker.catalog_service.catalog.service.SitemapService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/seo")
@RequiredArgsConstructor
public class SitemapController {

    private final SitemapService sitemapService;

    // Nginx가 /sitemap-games.xml 요청을 이 엔드포인트로 프록시함
    @GetMapping(value = "/sitemap-games.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> getGamesSitemap() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS).cachePublic())
                .contentType(MediaType.APPLICATION_XML)
                .body(sitemapService.buildGamesSitemap());
    }
}
