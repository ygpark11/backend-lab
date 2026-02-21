package com.pstracker.catalog_service.catalog.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class CollectRequestDto {
    private String psStoreId;
    private String title;
    private String englishTitle;
    private String publisher;
    private String imageUrl;
    private String description;

    // 가격 관련
    private Integer originalPrice;
    private Integer currentPrice;
    private Integer discountRate;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd", timezone = "Asia/Seoul")
    private LocalDate saleEndDate;

    private String genreIds;       // "Action, RPG" 형태의 문자열
    private LocalDate releaseDate;

    @JsonProperty("isPlusExclusive")
    private boolean isPlusExclusive; // PS Plus 전용 할인 여부

    @JsonProperty("inCatalog")
    private boolean inCatalog;

    private List<String> platforms;
}
