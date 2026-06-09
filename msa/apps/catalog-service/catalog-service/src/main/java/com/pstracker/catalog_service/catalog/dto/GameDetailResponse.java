package com.pstracker.catalog_service.catalog.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.domain.VoteType;
import com.pstracker.catalog_service.catalog.domain.tag.VibeTag;
import com.pstracker.catalog_service.global.domain.PriceVerdict;
import com.pstracker.catalog_service.global.util.PriceVerdictCalculator;

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
        @JsonProperty("isPs5ProEnhanced")
        boolean isPs5ProEnhanced,

        // 일자 정보
        LocalDate saleEndDate,
        LocalDate releaseDate,

        String pioneerName,

        // 평점 정보
        Integer mcMetaScore,
        Integer mcMetaCount,
        Double mcUserScore,
        Integer mcUserCount,
        Integer igdbCriticScore,
        Integer igdbCriticCount,
        Double igdbUserScore,
        Integer igdbUserCount,

        // HLTB 플레이타임
        Double hltbMainStory,
        Double hltbMainExtra,
        Double hltbCompletionist,

        List<VibeTagDto> vibeTags,

        // 투표 정보
        Integer likeCount,
        Integer dislikeCount,
        VoteType userVote,

        boolean liked,
        Integer myTargetPrice,
        LocalDateTime createdAt,

        // 판정 및 차트
        PriceVerdict priceVerdict, // 판정 결과
        List<PriceHistoryDto> priceHistory, // 차트용 데이터

        Integer scouterTotalWatchers,
        Integer scouterAverageTargetPrice,
        String defenseTier,
        String defenseMessage,

        // 기타
        List<String> platforms,
        List<String> genres,
        @JsonProperty("inCatalog")
        boolean inCatalog,

        // 연관 게임 리스트
        List<FamilyGameDto> familyGames,

        // 추천 게임 리스트
        List<RelatedGameDto> relatedGames
) implements Serializable {

    private static final long serialVersionUID = 1L;

    public GameDetailResponse withDynamicData(
            boolean isLiked, VoteType userVote,
            int totalWatchers, Integer avgTargetPrice, Integer myTargetPrice,
            String defTier, String defMessage) {

        return new GameDetailResponse(
                this.id, this.title, this.originalTitle, this.publisher,
                this.imageUrl, this.description, this.psStoreId,
                this.currentPrice, this.originalPrice, this.lowestPrice,
                this.discountRate, this.isPlusExclusive, this.isPs5ProEnhanced,
                this.saleEndDate, this.releaseDate, this.pioneerName,
                this.mcMetaScore, this.mcMetaCount, this.mcUserScore, this.mcUserCount,
                this.igdbCriticScore, this.igdbCriticCount, this.igdbUserScore, this.igdbUserCount,
                this.hltbMainStory, this.hltbMainExtra, this.hltbCompletionist,
                this.vibeTags,
                this.likeCount, this.dislikeCount, userVote,
                isLiked, myTargetPrice, this.createdAt, this.priceVerdict,
                this.priceHistory,
                totalWatchers, avgTargetPrice, defTier, defMessage,
                this.platforms, this.genres, this.inCatalog, this.familyGames, this.relatedGames
        );
    }

    public static GameDetailResponse from(
            Game game,
            List<PriceHistoryDto> history,
            boolean liked,
            List<FamilyGameDto> familyGames,
            List<RelatedGameDto> relatedGames
    ){

        Integer currentPrice = (game.getCurrentPrice() != null) ? game.getCurrentPrice() : 0;
        Integer originalPrice = (game.getOriginalPrice() != null) ? game.getOriginalPrice() : 0;
        Integer discountRate = (game.getDiscountRate() != null) ? game.getDiscountRate() : 0;
        Integer lowestPrice = (game.getAllTimeLowPrice() != null) ? game.getAllTimeLowPrice() : 0;

        PriceVerdict verdict = PriceVerdictCalculator.forGame(currentPrice, originalPrice, lowestPrice, history.size());

        // 3. 장르 문자열 파싱 ("Action, RPG" -> List)
        List<String> genreList = game.getGameGenres().stream()
                .map(gg -> gg.getGenre().getName())
                .toList();

        List<VibeTagDto> vibeTags;
        if(game.getVibeTags() == null || game.getVibeTags().isEmpty()) {
            vibeTags = List.of();
        } else {
            vibeTags = game.getVibeTags().stream()
                    .map(tag -> {
                        String color = VibeTag.fromTagName(tag).getParent().getParent().getColor();
                        return new VibeTagDto(tag, color);
                    })
                    .toList();
        }

        return new GameDetailResponse(
                game.getId(), game.getName(), game.getEnglishName(), game.getPublisher(),
                game.getImageUrl(), game.getDescription(), game.getPsStoreId(),
                currentPrice, originalPrice, lowestPrice, discountRate, game.isPlusExclusive(), game.isPs5ProEnhanced(),
                game.getSaleEndDate(), game.getReleaseDate(), game.getPioneerName(),
                game.getMcMetaScore(), game.getMcMetaCount(), game.getMcUserScore(), game.getMcUserCount(),
                game.getIgdbCriticScore(), game.getIgdbCriticCount(), game.getIgdbUserScore(), game.getIgdbUserCount(),
                game.getHltbMainStory(), game.getHltbMainExtra(), game.getHltbCompletionist(),
                vibeTags,
                game.getLikeCount(), game.getDislikeCount(), null,
                liked, null, game.getCreatedAt(), verdict, history,
                0, null, null ,null,
                game.getPlatforms().stream().map(Enum::name).toList(),
                genreList, game.isInCatalog(), familyGames, relatedGames
        );
    }

    public record FamilyGameDto(
            Long id,
            String name,
            Integer originalPrice,
            Integer currentPrice,
            Integer discountRate,
            @JsonProperty("isPlusExclusive") boolean isPlusExclusive,
            PriceVerdict priceVerdict,
            List<String> editionContents
    ) implements Serializable {
        private static final long serialVersionUID = 2L;
    }

    public record PriceHistoryDto(
            LocalDate date,
            Integer price,
            Integer discountRate,
            PriceVerdict verdict
    )implements Serializable {}

    public record VibeTagDto(
            String name,
            String color
    ) implements Serializable {}

    public record RelatedGameDto(
            Long id,
            String name,
            String imageUrl,
            Integer originalPrice,
            Integer currentPrice,
            Integer discountRate,
            LocalDate saleEndDate,
            Integer displayScore,
            PriceVerdict priceVerdict
    ) implements Serializable {}
}
