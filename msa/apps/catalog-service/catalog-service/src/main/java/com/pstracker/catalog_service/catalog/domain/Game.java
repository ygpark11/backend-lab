package com.pstracker.catalog_service.catalog.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.springframework.util.StringUtils.hasText;

@Entity
@Table(name = "games", indexes = {
        @Index(name = "idx_game_name", columnList = "name"),
        @Index(name = "idx_game_price", columnList = "current_price"),
        @Index(name = "idx_game_discount", columnList = "discount_rate"),
        @Index(name = "idx_game_meta", columnList = "metacritic_score"),
        @Index(name = "idx_game_updated", columnList = "last_updated_at")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Game {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ps_store_id", nullable = false, unique = true)
    private String psStoreId;

    @Column(nullable = false)
    private String name;

    @Column(name = "english_name")
    private String englishName;

    private String publisher;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "image_url")
    private String imageUrl;

    private String currency = "KRW"; // 기본값

    @Column(name = "metacritic_score")
    private Integer metaScore;

    @Column(name = "user_score")
    private Double userScore;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "last_updated_at")
    private LocalDateTime lastUpdated;

    @Column(name = "current_price")
    private Integer currentPrice;

    @Column(name = "original_price")
    private Integer originalPrice;

    @Column(name = "discount_rate")
    private Integer discountRate;

    @Column(name = "is_plus_exclusive")
    private boolean isPlusExclusive;

    @Column(name = "sale_end_date")
    private LocalDate saleEndDate;

    @Column(name = "in_catalog")
    private boolean inCatalog;

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

    @OneToMany(mappedBy = "game", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<GameGenre> gameGenres = new HashSet<>();

    // --- [생성 메서드] ---
    public static Game create(String psStoreId, String name, String englishName, String publisher, String imageUrl, String description) {
        LocalDateTime now = LocalDateTime.now();

        Game game = new Game();
        game.psStoreId = psStoreId;
        game.name = name;
        game.englishName = englishName;
        game.publisher = publisher;
        game.imageUrl = imageUrl;
        game.description = description;
        game.createdAt = now;
        game.lastUpdated = now;
        return game;
    }

    // --- [비즈니스 로직: 정보 업데이트 통합] ---
    public void updateInfo(String name, String englishName, String publisher,
                           String imageUrl, String description, Set<Genre> newGenres) {

        if (hasText(name) && !name.equals(this.name)) {
            this.name = name;
        }

        if (hasText(englishName)) {
            this.englishName = englishName;
        }

        // 기존 데이터가 없거나 "Unknown"일 때만 -> 새 데이터로 덮어씌움
        // 만약 기존에 "Square Enix"가 있는데 크롤러가 "Unknown"을 보내면? -> 무시함(기존 유지)
        boolean isNewValid = hasText(publisher) && !"Unknown".equals(publisher);
        boolean isCurrentInvalid = !hasText(this.publisher) || "Unknown".equals(this.publisher);

        if (isNewValid || (isCurrentInvalid && hasText(publisher))) {
            this.publisher = publisher;
        }

        if (hasText(imageUrl)) {
            this.imageUrl = imageUrl;
        }

        if (hasText(description) && !"Full Data Crawler".equals(description)) {
            this.description = description;
        }

        if (newGenres != null && !newGenres.isEmpty()) {
            syncGenres(newGenres);
        }

        this.lastUpdated = LocalDateTime.now();
    }

    /**
     * 장르 정보 동기화
     * @param newGenres 새로운 장르 집합
     */
    private void syncGenres(Set<Genre> newGenres) {
        // 1. 기존엔 있는데 새 목록엔 없으면 -> 삭제 (OrphanRemoval 동작)
        this.gameGenres.removeIf(gg -> !newGenres.contains(gg.getGenre()));

        // 2. 새 목록엔 있는데 기존엔 없으면 -> 추가
        // 현재 가지고 있는 장르 목록 추출
        Set<Genre> currentGenres = this.gameGenres.stream()
                .map(GameGenre::getGenre)
                .collect(Collectors.toSet());

        for (Genre genre : newGenres) {
            // 기존에 없는 장르만 새로 연결
            if (!currentGenres.contains(genre)) {
                this.gameGenres.add(new GameGenre(this, genre));
            }
        }
    }

    /**
     * 플랫폼 정보 업데이트
     * @param newPlatforms 새로운 플랫폼 집합
     */
    public void updatePlatforms(Set<Platform> newPlatforms) {
        // 기존 플랫폼 정보를 싹 비우고 새로 채움 (변동사항 반영)
        if (newPlatforms != null && !newPlatforms.isEmpty()) {
            this.platforms.clear();
            this.platforms.addAll(newPlatforms);
        }
    }

    /**
     * 메타크리틱 점수 및 유저 점수 업데이트
     * @param metaScore 메타크리틱 점수
     * @param userScore 유저 점수
     */
    public void updateRatings(Integer metaScore, Double userScore) {
        // null이 아닐 때만 갱신 (기존 데이터 보존)
        if (metaScore != null) {
            this.metaScore = metaScore;
        }
        if (userScore != null) {
            this.userScore = userScore;
        }
    }

    /**
     * 설명(Description) 업데이트
     * @param summary 새로운 설명 요약
     */
    public void updateDescription(String summary) {
        this.description = summary;
    }

    public void updatePriceSearchInfo(Integer originalPrice, Integer currentPrice, Integer discountRate,
                                      boolean isPlusExclusive, LocalDate saleEndDate, boolean inCatalog) {
        this.originalPrice = originalPrice;
        this.currentPrice = currentPrice;
        this.discountRate = discountRate;
        this.isPlusExclusive = isPlusExclusive;
        this.saleEndDate = saleEndDate;
        this.inCatalog = inCatalog;
    }
}