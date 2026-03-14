package com.pstracker.catalog_service.scraping.domain;

public enum ScrapingRequestStatus {
    PENDING,    // 큐 대기중
    PROCESSING, // 파이썬 크롤러 동작중
    COMPLETED,  // 수집 완료 (게임 테이블 저장 완료)
    FAILED      // 수집 실패 (에러 발생)
}
