package com.pstracker.catalog_service.catalog.domain.tag;

import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class TagTaxonomyRegistry {

    private static final Map<String, Map<String, List<String>>> FULL_TAXONOMY;
    private static final String ALL_ALLOWED_TAGS_STRING;

    static {
        FULL_TAXONOMY = Arrays.stream(VibeTag.values())
                .collect(Collectors.groupingBy(
                        tag -> tag.getParent().getParent().getDescription(),
                        LinkedHashMap::new,
                        Collectors.groupingBy(
                                tag -> tag.getParent().getDescription(),
                                LinkedHashMap::new,
                                Collectors.mapping(VibeTag::getTagName, Collectors.toList())
                        )
                ));

        // 2. AI 프롬프트용 텍스트 조립
        // 결과 예시:
        // [플레이 스타일]: #타격감원탑, #무쌍난무, ...
        // [분위기 & 스토리]: #눈물샘자극, #한편의영화, ...
        ALL_ALLOWED_TAGS_STRING = FULL_TAXONOMY.entrySet().stream()
                .map(mainEntry -> {
                    String mainCategory = mainEntry.getKey();
                    String tagsInMain = mainEntry.getValue().values().stream()
                            .flatMap(List::stream)
                            .collect(Collectors.joining(", "));
                    return String.format("[%s]: %s", mainCategory, tagsInMain);
                })
                .collect(Collectors.joining("\n"));
    }

    public Map<String, Map<String, List<String>>> getFullTaxonomy() {
        return FULL_TAXONOMY;
    }

    public String getAllAllowedTagsAsString() {
        return ALL_ALLOWED_TAGS_STRING;
    }
}