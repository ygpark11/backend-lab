package com.pstracker.catalog_service.scraping.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "game_candidates")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GameCandidate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ps_store_id", nullable = false, unique = true)
    private String psStoreId;

    @Column(nullable = false)
    private String title;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public GameCandidate(String psStoreId, String title, String imageUrl) {
        this.psStoreId = psStoreId;
        this.title = title;
        this.imageUrl = imageUrl;
        this.createdAt = LocalDateTime.now();
    }
}