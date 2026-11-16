package com.pstracker.catalog_service.global.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    GAME_NOT_FOUND(HttpStatus.NOT_FOUND, "해당 게임을 찾을 수 없습니다."),
    MEMBER_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 회원입니다."),
    ANNOUNCEMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "해당 공지사항을 찾을 수 없습니다."),
    FILTER_PRESET_NOT_FOUND(HttpStatus.NOT_FOUND, "프리셋을 찾을 수 없습니다."),
    NOTIFICATION_NOT_FOUND(HttpStatus.NOT_FOUND, "알림을 찾을 수 없습니다."),
    SCRAPING_REQUEST_NOT_FOUND(HttpStatus.NOT_FOUND, "요청을 찾을 수 없습니다."),
    CANDIDATE_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 후보 게임입니다."),
    CRAWLER_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "크롤러 서버 연결에 실패했습니다.");

    private final HttpStatus status;
    private final String defaultMessage;
}
