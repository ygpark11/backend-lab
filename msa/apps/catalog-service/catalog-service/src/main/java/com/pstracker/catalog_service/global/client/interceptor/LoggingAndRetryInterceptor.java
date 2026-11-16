package com.pstracker.catalog_service.global.client.interceptor;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;

import java.io.IOException;
import java.util.Set;

/**
 * 전역 HTTP 요청 로깅 및 재시도 인터셉터
 * - 요청/응답 로깅
 * - 멱등(Idempotent) 메서드에서 IO 예외(타임아웃, 네트워크 끊김) 발생 시 최대 3회 재시도
 * - POST/PATCH 등 비멱등 요청 및 HTTP 오류 응답(4xx, 5xx)은 중복 실행 방지를 위해 재시도하지 않음
 */
@Slf4j
public class LoggingAndRetryInterceptor implements ClientHttpRequestInterceptor {

    private static final int MAX_ATTEMPTS = 3;
    private static final long RETRY_DELAY_MS = 2_000L;
    private static final Set<HttpMethod> IDEMPOTENT_METHODS = Set.of(
            HttpMethod.GET, HttpMethod.HEAD, HttpMethod.PUT, HttpMethod.DELETE, HttpMethod.OPTIONS
    );

    @Override
    public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution) throws IOException {
        HttpMethod httpMethod = request.getMethod();
        String method = httpMethod.toString();
        String url = request.getURI().toString();
        long start = System.currentTimeMillis();
        int maxAttempts = IDEMPOTENT_METHODS.contains(httpMethod) ? MAX_ATTEMPTS : 1;

        log.debug("API Request: {} {}", method, url);

        IOException lastException = null;

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                ClientHttpResponse response = execution.execute(request, body);

                log.debug("API Response: {} {} → {} ({}ms)",
                        method, url, response.getStatusCode(), System.currentTimeMillis() - start);

                return response;

            } catch (IOException e) {
                lastException = e;
                log.error("API 요청 실패 (시도 {}/{}): {} {} - {}", attempt, maxAttempts, method, url, e.getMessage());

                if (attempt < maxAttempts) {
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
