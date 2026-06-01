package com.pstracker.catalog_service.scraping.domain;

import com.pstracker.catalog_service.global.domain.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "game_candidates")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GameCandidate extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ps_store_id", nullable = false, unique = true)
    private String psStoreId;

    @Column(nullable = false)
    private String title;

    @Column(name = "image_url")
    private String imageUrl;

    @Builder
    public GameCandidate(String psStoreId, String title, String imageUrl) {
        this.psStoreId = psStoreId;
        this.title = title;
        this.imageUrl = imageUrl;
    }
}
