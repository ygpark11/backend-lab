package com.pstracker.catalog_service.catalog.domain;

import com.pstracker.catalog_service.global.util.ChosungUtils;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

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
        @Index(name = "idx_game_updated", columnList = "last_updated_at"),
        @Index(name = "idx_game_family", columnList = "family_id")
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

    @Column(name = "igdb_critic_score")
    private Integer igdbCriticScore;

    @Column(name = "igdb_critic_count")
    private Integer igdbCriticCount;

    @Column(name = "igdb_user_score")
    private Double igdbUserScore;

    @Column(name = "igdb_user_count")
    private Integer igdbUserCount;

    @Column(name = "mc_meta_score")
    private Integer mcMetaScore;

    @Column(name = "mc_meta_count")
    private Integer mcMetaCount;

    @Column(name = "mc_user_score")
    private Double mcUserScore;

    @Column(name = "mc_user_count")
    private Integer mcUserCount;

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

    @Column(name = "release_date")
    private LocalDate releaseDate;

    @Column(name = "in_catalog")
    private boolean inCatalog;

    @Column(name = "all_time_low_price")
    private Integer allTimeLowPrice;

    @Column(name = "chosung_name")
    private String chosungName;

    @Column(name = "like_count", nullable = false)
    private Integer likeCount = 0;

    @Column(name = "dislike_count", nullable = false)
    private Integer dislikeCount = 0;

    @Column(name = "family_id", length = 50)
    private String familyId;

    @Column(name = "pioneer_member_id")
    private Long pioneerMemberId;

    @Column(name = "pioneer_name")
    private String pioneerName;

    @Column(name = "is_ps5_pro_enhanced")
    private boolean isPs5ProEnhanced;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "vibe_tags", columnDefinition = "json")
    private List<String> vibeTags;

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

    @Column(name = "best_seller_rank")
    private Integer bestSellerRank;

    @Column(name = "most_downloaded_rank")
    private Integer mostDownloadedRank;

    @OneToMany(mappedBy = "game", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<GameGenre> gameGenres = new HashSet<>();

    public static String extractFamilyId(String psStoreId) {
        if (!hasText(psStoreId)) return null;
        String[] parts = psStoreId.split("-");
        if (parts.length >= 2) {
            return parts[1]; // 예: HP0700-PPSA10593_00-TEKKEN -> PPSA10593_00 추출
        }
        return psStoreId; // 규칙에 안 맞으면 원본 유지
    }

    // --- [생성 메서드] ---
    public static Game create(String psStoreId, String name, String englishName,
                              String publisher, String imageUrl, String description,
                              LocalDate releaseDate) {
        LocalDateTime now = LocalDateTime.now();

        Game game = new Game();
        game.psStoreId = psStoreId;
        game.familyId = extractFamilyId(psStoreId);
        game.name = name;
        game.englishName = englishName;
        game.publisher = publisher;
        game.imageUrl = imageUrl;
        game.description = description;
        game.releaseDate = releaseDate;
        game.createdAt = now;
        game.lastUpdated = now;
        game.chosungName = ChosungUtils.extract(name);
        return game;
    }

    // --- [비즈니스 로직: 정보 업데이트 통합] ---
    public void updateInfo(String name, String englishName, String publisher,
                           String imageUrl, String description, LocalDate releaseDate, Set<Genre> newGenres,
                           boolean isPs5ProEnhanced) {

        if (hasText(name) && !name.equals(this.name)) {
            this.name = name;
            this.chosungName = ChosungUtils.extract(name);
        }

        if (!hasText(this.englishName) && hasText(englishName)) {
            this.englishName = englishName;
        }

        // 기존 데이터가 없거나 "Unknown"일 때만 -> 새 데이터로 덮어씌움
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

        if(releaseDate != null && !releaseDate.equals(this.releaseDate)) {
            this.releaseDate = releaseDate;
        }

        if (newGenres != null && !newGenres.isEmpty()) {
            syncGenres(newGenres);
        }

        if (this.familyId == null && hasText(this.psStoreId)) {
            this.familyId = extractFamilyId(this.psStoreId);
        }

        if (isPs5ProEnhanced) {
            this.isPs5ProEnhanced = true;
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

    public void updateIgdbRatings(Integer criticScore, Integer criticCount, Double userScore, Integer userCount) {
        if(criticScore != null) {
            this.igdbCriticScore = criticScore;
        }
        if(criticCount != null) {
            this.igdbCriticCount = criticCount;
        }
        if(userScore != null) {
            this.igdbUserScore = userScore;
        }
        if(userCount != null) {
            this.igdbUserCount = userCount;
        }

        if (criticScore != null) {
            this.metaScore = criticScore;
        }
        if (userScore != null) {
            this.userScore = userScore;
        }
    }

    public void updateMetacriticRatings(Integer metaScore, Integer metaCount, Double userScore, Integer userCount) {
        if (metaScore != null) {
            this.mcMetaScore = metaScore;
        }
        if (metaCount != null) {
            this.mcMetaCount = metaCount;
        }
        if (userScore != null) {
            this.mcUserScore = userScore;
        }
        if (userCount != null) {
            this.mcUserCount = userCount;
        }
    }

    /**
     * 설명(Description) 업데이트
     * @param summary 새로운 설명 요약
     */
    public void updateDescription(String summary) {
        this.description = summary;
    }

    public void updateAiInsights(String summary, List<String> vibeTags) {
        if (hasText(summary)) {
            this.description = summary;
        }
        if (vibeTags != null && !vibeTags.isEmpty()) {
            this.vibeTags = vibeTags;
        }
    }

    public void updatePriceSearchInfo(Integer originalPrice, Integer currentPrice, Integer discountRate,
                                      boolean isPlusExclusive, LocalDate saleEndDate, boolean inCatalog) {
        this.originalPrice = originalPrice;
        this.currentPrice = currentPrice;
        this.discountRate = discountRate;
        this.isPlusExclusive = isPlusExclusive;
        this.saleEndDate = saleEndDate;
        this.inCatalog = inCatalog;

        if (currentPrice != null && currentPrice > 0) {
            if (this.allTimeLowPrice == null || this.allTimeLowPrice == 0 || currentPrice < this.allTimeLowPrice) {
                this.allTimeLowPrice = currentPrice;
            }
        }
    }

    public void updatePioneerInfo(Long memberId, String nickname) {
        if (this.pioneerMemberId == null && this.pioneerName == null) {
            this.pioneerMemberId = memberId;
            this.pioneerName = nickname;
        }
    }

    public void addLike() {
        this.likeCount++;
    }

    public void removeLike() {
        if (this.likeCount > 0) this.likeCount--;
    }

    public void addDislike() {
        this.dislikeCount++;
    }

    public void removeDislike() {
        if (this.dislikeCount > 0) this.dislikeCount--;
    }

    public void updateRank(String rankingType, Integer rank) {
        if ("BEST_SELLER".equals(rankingType)) {
            this.bestSellerRank = rank;
        } else if ("MOST_DOWNLOADED".equals(rankingType)) {
            this.mostDownloadedRank = rank;
        }
    }
}