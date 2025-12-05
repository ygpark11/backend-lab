package com.pstracker.catalog_service.catalog.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "games")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Game {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ps_store_id", nullable = false, unique = true)
    private String psStoreId;

    @Column(nullable = false)
    private String name; // title -> name 변경 (DB 컬럼명 일치)

    private String publisher; // [복구 완료]

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "image_url")
    private String imageUrl;

    private String currency = "KRW"; // 기본값

    @Column(name = "genre_ids")
    private String genreIds;

    @Column(name = "metacritic_score")
    private Integer metaScore;

    @Column(name = "user_score")
    private Double userScore;

    @Column(name = "last_updated_at")
    private LocalDateTime lastUpdated;

    // 양방향 매핑 (게임 삭제 시 가격 이력도 같이 삭제)
    @OneToMany(mappedBy = "game", cascade = CascadeType.ALL)
    private List<GamePriceHistory> priceHistories = new ArrayList<>();

    @ElementCollection(targetClass = Platform.class, fetch = FetchType.LAZY)
    @CollectionTable(
            name = "game_platforms",
            joinColumns = @JoinColumn(name = "game_id")
    )
    @Enumerated(EnumType.STRING)
    @Column(name = "platform")
    private Set<Platform> platforms = new HashSet<>();

    // [Helper Method] 플랫폼 정보 갱신용 편의 메서드
    public void updatePlatforms(Set<Platform> newPlatforms) {
        // 기존 플랫폼 정보를 싹 비우고 새로 채움 (변동사항 반영)
        this.platforms.clear();
        if (newPlatforms != null) {
            this.platforms.addAll(newPlatforms);
        }
    }

    // --- [생성 메서드] ---
    public static Game create(String psStoreId, String name, String publisher, String imageUrl, String description) {
        Game game = new Game();
        game.psStoreId = psStoreId;
        game.name = name;
        game.publisher = publisher;
        game.imageUrl = imageUrl;
        game.description = description;
        game.lastUpdated = LocalDateTime.now();
        return game;
    }

    // --- [비즈니스 로직: 정보 업데이트 통합] ---
    // 크롤링 할 때마다 변할 수 있는 정보들을 한 번에 갱신합니다.
    public void updateInfo(String name, String publisher, String imageUrl, String description, String genreIds) {
        this.name = name;
        this.publisher = publisher;
        this.imageUrl = imageUrl;
        this.description = description;
        this.genreIds = genreIds;
        this.lastUpdated = LocalDateTime.now();
    }
}