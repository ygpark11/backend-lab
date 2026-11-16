package com.pstracker.catalog_service.global.exception;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    @DisplayName("BusinessException은 ErrorCode의 HTTP 상태코드와 메시지를 반환한다")
    void handleBusinessException_returnsErrorCodeStatusAndMessage() {
        BusinessException ex = new BusinessException(ErrorCode.GAME_NOT_FOUND, "게임을 찾을 수 없습니다. id=42");

        ResponseEntity<ErrorResponse> response = handler.handleBusinessException(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().message()).isEqualTo("게임을 찾을 수 없습니다. id=42");
    }

    @Test
    @DisplayName("예상하지 못한 Exception은 500 Internal Server Error와 안전한 기본 메시지를 반환한다")
    void handleUnexpectedException_returns500WithGenericMessage() {
        RuntimeException ex = new NullPointerException("sensitive internal detail");

        ResponseEntity<ErrorResponse> response = handler.handleUnexpectedException(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().message()).isEqualTo("서버 내부 오류가 발생했습니다.");
    }
}
