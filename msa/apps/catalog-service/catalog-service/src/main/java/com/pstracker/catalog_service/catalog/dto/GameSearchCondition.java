package com.pstracker.catalog_service.catalog.dto;

import com.pstracker.catalog_service.catalog.domain.Platform;
import lombok.Data;

import java.util.List;
import java.util.stream.Collectors;

@Data
public class GameSearchCondition {
    // 검색어 (게임명 - 한글/영문)
    private String keyword;

    // 가격 범위 (예: 1000원 ~ 30000원)
    private Integer minPrice;
    private Integer maxPrice;

    // 할인율 (예: 50% 이상)
    private Integer minDiscountRate;

    // 평점 (메타스코어 OR 유저스코어)
    private Integer minMetaScore;
    private Double minUserScore;

    // 특정 플랫폼 (PS5, PS4...)
    private Platform platform;

    // PS Plus 전용 할인 여부
    private Boolean isPlusExclusive;

    // 장르 필터
    private String genre;

    private Boolean inCatalog;
    private Boolean isAllTimeLow;
    private Boolean isPs5ProEnhanced;

    private Boolean isBestSeller;
    private Boolean isMostDownloaded;

    // 신규 할인 시작
    private Boolean isNewDiscount;

    // 마감 임박
    private Boolean isClosingSoon;

    private Double minPlayTime;
    private Double maxPlayTime;

    // 바이브 태그 필터 (OR 조합)
    private List<String> vibeTags;

    // 큐레이션 테마 미리보기 여부 (UI 없음, CurationPage에서만 true로 전달)
    private Boolean curation;

    /**
     * 큐레이션 캐시 키 생성.
     * 동일한 필터 조합이면 항상 같은 키를 반환하도록 vibeTags는 정렬 후 결합.
     * sort(정렬 기준)는 Pageable에서 오므로 @Cacheable key 표현식에서 별도로 추가.
     */
    public String curationCacheKey() {
        String sortedTags = (vibeTags == null || vibeTags.isEmpty()) ? ""
                : vibeTags.stream().sorted().collect(Collectors.joining(","));
        return String.join("_",
                sortedTags,
                str(minDiscountRate), str(minMetaScore), str(minUserScore),
                str(minPrice), str(maxPrice),
                str(minPlayTime), str(maxPlayTime),
                str(isAllTimeLow), str(inCatalog), str(isPs5ProEnhanced),
                str(isClosingSoon), str(genre)
        );
    }

    private String str(Object val) {
        return val == null ? "" : String.valueOf(val);
    }
}
