package com.pstracker.catalog_service.catalog.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "games", indexes = {
        @Index(name = "idx_ps_store_id", columnList = "psStoreId", unique = true) // 검색 최적화
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // JPA 기본 생성자 (보안상 Protected 권장)
public class Game {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 1. 식별자
    @Column(nullable = false, unique = true)
    private String psStoreId; // PS Store URL에 있는 고유 ID (예: UP0006-PPSA01323_00-ELDENRING0000000)

    // 2. 기본 정보
    @Column(nullable = false)
    private String title; // 게임 제목

    @Column(length = 2000)
    private String description; // 게임 설명 (길 수 있음)

    private String publisher; // 배급사

    private String imageUrl; // 메인 포스터 이미지 URL

    // 3. 가격 정보 (크롤링 시점 기준)
    // *주의: 가격 히스토리는 별도 서비스로 가지만, "현재가/최저가"는 조회용으로 여기에 둔다 (역정규화)
    private int currentPrice; // 현재 가격
    private boolean isDiscount; // 지금 할인 중인가?
    private int discountRate; // 할인율 (예: 50 -> 50%)

    // 4. 메타 데이터 (Intelligence)
    private Integer metaScore; // 메타크리틱 점수 (없을 수 있음 -> Integer)
    private Double userScore; // 유저 평점

    // 5. 관리 정보
    private LocalDateTime lastUpdated; // 마지막 크롤링 시간

    // 생성자 (Builder 패턴 대신 정적 팩토리 메서드 사용 추천 - 의미가 명확함)
    public static Game create(String psStoreId, String title, String publisher, String imageUrl) {
        Game game = new Game();
        game.psStoreId = psStoreId;
        game.title = title;
        game.publisher = publisher;
        game.imageUrl = imageUrl;
        game.lastUpdated = LocalDateTime.now();
        return game;
    }

    // 가격 정보 업데이트 메서드 (Setter 대신 의미있는 메서드명 사용)
    public void updatePriceInfo(int currentPrice, boolean isDiscount, int discountRate) {
        this.currentPrice = currentPrice;
        this.isDiscount = isDiscount;
        this.discountRate = discountRate;
        this.lastUpdated = LocalDateTime.now();
    }
}