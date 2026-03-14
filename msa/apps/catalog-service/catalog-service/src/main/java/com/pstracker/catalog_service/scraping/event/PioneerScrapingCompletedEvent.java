package com.pstracker.catalog_service.scraping.event;

import com.pstracker.catalog_service.member.domain.Member;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class PioneerScrapingCompletedEvent {
    private final String psStoreId;
    private final Member member;
}
