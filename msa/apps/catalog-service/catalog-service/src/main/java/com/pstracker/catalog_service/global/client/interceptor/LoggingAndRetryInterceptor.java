package com.pstracker.catalog_service.global.client.interceptor;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;

import java.io.IOException;

/**
 * 전역 HTTP 요청 로깅 및 재시도 인터셉터
 * - 요청/응답 로깅
 * - IO 예외(타임아웃, 네트워크 끊김) 발생 시 최대 3회 재시도
 * - HTTP 오류 응답(4xx, 5xx)은 재시도 대상이 아니므로 호출부에서 처리
 */
@Slf4j
public class LoggingAndRetryInterceptor implements ClientHttpRequestInterceptor {

    private static final int MAX_ATTEMPTS = 3;
    private static final long RETRY_DELAY_MS = 2_000L;

    @Override
    public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution) throws IOException {
        String method = request.getMethod().toString();
        String url = request.getURI().toString();
        long start = System.currentTimeMillis();

        log.debug("API Request: {} {}", method, url);

        IOException lastException = null;

        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                ClientHttpResponse response = execution.execute(request, body);

                log.debug("API Response: {} {} → {} ({}ms)",
                        method, url, response.getStatusCode(), System.currentTimeMillis() - start);

                return response;

            } catch (IOException e) {
                lastException = e;
                log.error("API 요청 실패 (시도 {}/{}): {} - {}", attempt, MAX_ATTEMPTS, url, e.getMessage());

                if (attempt < MAX_ATTEMPTS) {
                    try {
                        Thread.sleep(RETRY_DELAY_MS);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new IOException("재시도 대기 중 인터럽트 발생", ie);
                    }
                }
            }
        }

        throw lastException;
    }
}
