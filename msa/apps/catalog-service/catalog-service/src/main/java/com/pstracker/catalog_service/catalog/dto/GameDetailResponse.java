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

        String pioneerName,

        // [평점 정보]
        Integer metaScore,
        Double userScore,

        // [투표 정보]
        Integer likeCount,
        Integer dislikeCount,
        VoteType userVote,

        boolean liked,
        Integer myTargetPrice,
        LocalDateTime createdAt,

        // [판정 및 차트]
        PriceVerdict priceVerdict, // 판정 결과
        String verdictMessage,     // 판정 메시지
        List<PriceHistoryDto> priceHistory, // 차트용 데이터

        Integer scouterTotalWatchers,
        Integer scouterAverageTargetPrice,
        String defenseTier,
        String defenseMessage,

        // [기타]
        List<String> platforms,
        List<String> genres,
        @JsonProperty("inCatalog")
        boolean inCatalog,
        List<FamilyGameDto> familyGames,

        // [추천 게임 리스트]
        List<GameSearchResultDto> relatedGames
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
                this.discountRate, this.isPlusExclusive, this.saleEndDate,
                this.releaseDate, this.pioneerName, this.metaScore, this.userScore,
                this.likeCount, this.dislikeCount, userVote,
                isLiked, myTargetPrice, this.createdAt, this.priceVerdict,
                this.verdictMessage, this.priceHistory,
                totalWatchers, avgTargetPrice, defTier, defMessage,
                this.platforms, this.genres, this.inCatalog, this.familyGames, this.relatedGames
        );
    }

    public static PriceVerdict calculateVerdict(Integer targetPrice, Integer originalPrice, Integer lowestPrice, int historySize) {
        if (targetPrice == null || targetPrice == 0 || historySize == 0) return PriceVerdict.TRACKING;

        if (historySize == 1) {
            return (targetPrice < originalPrice) ? PriceVerdict.TRACKING : PriceVerdict.WAIT;
        }

        int safeLowest = (lowestPrice == null || lowestPrice == 0) ? targetPrice : lowestPrice;

        if (targetPrice > 0 && targetPrice <= safeLowest) return PriceVerdict.BUY_NOW;
        if (targetPrice < originalPrice) {
            double diffPercent = (double) (targetPrice - safeLowest) / safeLowest * 100;
            return (diffPercent <= 20.0) ? PriceVerdict.GOOD_OFFER : PriceVerdict.WAIT;
        }
        return PriceVerdict.WAIT;
    }

    public static GameDetailResponse from(
            Game game,
            List<PriceHistoryDto> history,
            boolean liked,
            List<FamilyGameDto> familyGames,
            List<GameSearchResultDto> relatedGames
    ){

        Integer currentPrice = (game.getCurrentPrice() != null) ? game.getCurrentPrice() : 0;
        Integer originalPrice = (game.getOriginalPrice() != null) ? game.getOriginalPrice() : 0;
        Integer discountRate = (game.getDiscountRate() != null) ? game.getDiscountRate() : 0;
        Integer lowestPrice = (game.getAllTimeLowPrice() != null) ? game.getAllTimeLowPrice() : 0;

        // 🚀 분리된 유틸리티 메서드를 사용하여 현재 상태 판정
        PriceVerdict verdict = calculateVerdict(currentPrice, originalPrice, lowestPrice, history.size());
        String verdictMsg;

        if (verdict == PriceVerdict.TRACKING) {
            verdictMsg = (history.size() == 1 && currentPrice < originalPrice)
                    ? "첫 수집된 할인 정보예요! 역대 최저가인지 확인하기 위해 데이터가 더 필요해요."
                    : "가격 정보를 수집하는 중입니다. 🕵️";
        } else if (verdict == PriceVerdict.WAIT && history.size() == 1) {
            verdictMsg = "아직은 정가예요. 할인이 시작될 때까지 기다려보세요!";
        } else if (verdict == PriceVerdict.GOOD_OFFER) {
            double diffPercent = (double) (currentPrice - (lowestPrice == 0 ? currentPrice : lowestPrice)) / (lowestPrice == 0 ? currentPrice : lowestPrice) * 100;
            verdictMsg = String.format("역대 최저가보다 %.0f%% 높지만 괜찮은 가격이에요!", diffPercent);
        } else if (verdict == PriceVerdict.WAIT && currentPrice < originalPrice) {
            verdictMsg = String.format("아쉬운 할인율! 최저가(%s원) 대비 비싸요.", lowestPrice == 0 ? currentPrice : lowestPrice);
        } else {
            verdictMsg = verdict.getMessage();
        }

        // 3. 장르 문자열 파싱 ("Action, RPG" -> List)
        List<String> genreList = game.getGameGenres().stream()
                .map(gg -> gg.getGenre().getName())
                .toList();

        return new GameDetailResponse(
                game.getId(), game.getName(), game.getEnglishName(), game.getPublisher(),
                game.getImageUrl(), game.getDescription(), game.getPsStoreId(),
                currentPrice, originalPrice, lowestPrice, discountRate, game.isPlusExclusive(),
                game.getSaleEndDate(), game.getReleaseDate(), game.getPioneerName(), game.getMetaScore(), game.getUserScore(),
                game.getLikeCount(), game.getDislikeCount(), null,
                liked, null, game.getCreatedAt(), verdict, verdictMsg, history,
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
            PriceVerdict priceVerdict
    ) implements Serializable {}

    public record PriceHistoryDto(
            LocalDate date,
            Integer price,
            Integer discountRate,
            PriceVerdict verdict
    )implements Serializable {}
}
