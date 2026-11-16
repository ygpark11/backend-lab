package com.pstracker.catalog_service.catalog.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;

import java.time.LocalDate;
import java.util.List;

@Builder(toBuilder = true)
public record CollectRequest(
        String psStoreId,
        String title,
        String englishTitle,
        String publisher,
        String imageUrl,
        String description,
        Integer originalPrice,
        Integer currentPrice,
        Integer discountRate,
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd", timezone = "Asia/Seoul")
        LocalDate saleEndDate,
        String genreIds,
        LocalDate releaseDate,
        @JsonProperty("isPlusExclusive") boolean isPlusExclusive,
        @JsonProperty("inCatalog") boolean inCatalog,
        List<String> platforms,
        @JsonProperty("isPs5ProEnhanced") boolean isPs5ProEnhanced,
        List<String> editionContents
) {
}
