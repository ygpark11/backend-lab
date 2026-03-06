package com.pstracker.catalog_service.catalog.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.domain.PriceVerdict;
import com.pstracker.catalog_service.catalog.domain.VoteType;

import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record GameDetailResponse(
        Long id,
        String title,
        String originalTitle,
        String publisher,
        String imageUrl,
        String description,
        String psStoreId,

        Integer currentPrice,
        Integer originalPrice,
        Integer lowestPrice,
        Integer discountRate,
        @JsonProperty("isPlusExclusive")
        boolean isPlusExclusive,

        // [일자 정보]
        LocalDate saleEndDate,
        LocalDate releaseDate,

        // [평점 정보]
        Integer metaScore,
        Double userScore,

        // [투표 정보]
        Integer likeCount,
        Integer dislikeCount,
        VoteType userVote,

        boolean liked,
        LocalDateTime createdAt,

        // [판정 및 차트]
        PriceVerdict priceVerdict, // 판정 결과
        String verdictMessage,     // 판정 메시지
        List<PriceHistoryDto> priceHistory, // 차트용 데이터

        // [기타]
        List<String> platforms,
        List<String> genres,
        @JsonProperty("inCatalog")
        boolean inCatalog,

        // [추천 게임 리스트]
        List<GameSearchResultDto> relatedGames
) implements Serializable {

    private static final long serialVersionUID = 1L;

    public GameDetailResponse withDynamicData(boolean isLiked, VoteType userVote) {
        return new GameDetailResponse(
                this.id, this.title, this.originalTitle, this.publisher,
                this.imageUrl, this.description, this.psStoreId,
                this.currentPrice, this.originalPrice, this.lowestPrice,
                this.discountRate, this.isPlusExclusive, this.saleEndDate,
                this.releaseDate, this.metaScore, this.userScore,

                this.likeCount, this.dislikeCount, userVote,

                isLiked, this.createdAt, this.priceVerdict,
                this.verdictMessage, this.priceHistory, this.platforms,
                this.genres, this.inCatalog, this.relatedGames
        );
    }

    public static GameDetailResponse from(
            Game game,
            List<PriceHistoryDto> history,
            boolean liked,
            List<GameSearchResultDto> relatedGames
    ){

        // 1. 가격 정보 추출 (역정규화된 Game 필드 사용)
        Integer currentPrice = (game.getCurrentPrice() != null) ? game.getCurrentPrice() : 0;
        Integer originalPrice = (game.getOriginalPrice() != null) ? game.getOriginalPrice() : 0;
        Integer discountRate = (game.getDiscountRate() != null) ? game.getDiscountRate() : 0;
        Integer lowestPrice = (game.getAllTimeLowPrice() != null) ? game.getAllTimeLowPrice() : 0;

        boolean isPlus = game.isPlusExclusive();
        LocalDate endDate = game.getSaleEndDate();
        LocalDate releaseDate = game.getReleaseDate();
        boolean isInCatalog = game.isInCatalog();

        PriceVerdict verdict;
        String verdictMsg;

        // 1. 데이터 존재 여부 확인
        if (game.getCurrentPrice() == null || history.isEmpty()) {
            verdict = PriceVerdict.TRACKING;
            verdictMsg = "가격 정보를 수집하는 중입니다. 🕵️";
        }
        // 2. 데이터가 1개뿐인 경우 (비교군 부족)
        else if (history.size() == 1) {
            if (currentPrice < originalPrice) {
                // 할인은 하고 있는데, 이전에 얼마였는지 모름 -> 섣불리 추천하지 말고 지켜보자
                verdict = PriceVerdict.TRACKING;
                verdictMsg = "첫 수집된 할인 정보예요! 역대 최저가인지 확인하기 위해 데이터가 더 필요해요.";
            } else {
                // 정가임 -> 이건 확실히 WAIT
                verdict = PriceVerdict.WAIT;
                verdictMsg = "아직은 정가예요. 할인이 시작될 때까지 기다려보세요!";
            }
        }
        // 3. 데이터가 충분함 (변동 이력이 2개 이상) -> 본격 판정
        else {
            int safeLowest = (lowestPrice == 0) ? currentPrice : lowestPrice;

            if (currentPrice > 0 && currentPrice <= safeLowest) {
                verdict = PriceVerdict.BUY_NOW;
                verdictMsg = PriceVerdict.BUY_NOW.getMessage();
            } else if (currentPrice < originalPrice) {
                // 할인율 정밀 분석
                double diffPercent = (double) (currentPrice - safeLowest) / safeLowest * 100;
                if (diffPercent <= 20.0) { // 최저가 대비 20% 이내
                    verdict = PriceVerdict.GOOD_OFFER;
                    verdictMsg = String.format("역대 최저가보다 %.0f%% 높지만 괜찮은 가격이에요!", diffPercent);
                } else {
                    verdict = PriceVerdict.WAIT;
                    verdictMsg = String.format("아쉬운 할인율! 최저가(%s원) 대비 비싸요.", safeLowest);
                }
            } else {
                verdict = PriceVerdict.WAIT;
                verdictMsg = PriceVerdict.WAIT.getMessage();
            }
        }

        // 3. 장르 문자열 파싱 ("Action, RPG" -> List)
        List<String> genreList = game.getGameGenres().stream()
                .map(gg -> gg.getGenre().getName())
                .toList();

        return new GameDetailResponse(
                game.getId(), game.getName(), game.getEnglishName(), game.getPublisher(),
                game.getImageUrl(), game.getDescription(), game.getPsStoreId(),
                currentPrice, originalPrice, lowestPrice, discountRate, isPlus,
                endDate, releaseDate, game.getMetaScore(), game.getUserScore(),

                game.getLikeCount(), game.getDislikeCount(), null,

                liked, game.getCreatedAt(), verdict, verdictMsg, history,
                game.getPlatforms().stream().map(Enum::name).toList(),
                genreList, isInCatalog, relatedGames
        );
    }

    public record PriceHistoryDto(
            LocalDate date,
            Integer price,
            Integer discountRate
    )implements Serializable {}
}
