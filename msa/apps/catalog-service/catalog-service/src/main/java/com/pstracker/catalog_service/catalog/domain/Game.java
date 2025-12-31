package com.pstracker.catalog_service.catalog.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

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
    // 크롤링 할 때마다 변할 수 있는 정보들을 한 번에 갱신합니다.
    public void updateInfo(String name, String englishName, String publisher,
                           String imageUrl, String description, Set<Genre> newGenres) {
        this.name = name;

        // 영문명은 있을 때만 갱신
        if (StringUtils.hasText(englishName)) {
            this.englishName = englishName;
        }

        this.publisher = publisher;
        this.imageUrl = imageUrl;
        this.description = description;
        this.lastUpdated = LocalDateTime.now();

        // 장르 동기화 로직
        if (newGenres != null) {
            syncGenres(newGenres);
        }
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
        this.platforms.clear();
        if (newPlatforms != null) {
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
}