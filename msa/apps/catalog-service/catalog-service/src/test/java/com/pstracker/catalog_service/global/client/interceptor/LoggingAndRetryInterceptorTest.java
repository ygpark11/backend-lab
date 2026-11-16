package com.pstracker.catalog_service.global.client.interceptor;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.mock.http.client.MockClientHttpRequest;

import java.io.IOException;
import java.net.URI;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

class LoggingAndRetryInterceptorTest {

    private final LoggingAndRetryInterceptor interceptor = new LoggingAndRetryInterceptor();

    @Test
    @DisplayName("POST 요청은 IOException 발생 시 재시도하지 않는다")
    void postRequest_doesNotRetryOnIOException() throws IOException {
        HttpRequest request = mockRequest(HttpMethod.POST);
        ClientHttpRequestExecution execution = mock(ClientHttpRequestExecution.class);
        given(execution.execute(any(), any())).willThrow(new IOException("read timeout"));

        assertThatThrownBy(() -> interceptor.intercept(request, new byte[0], execution))
                .isInstanceOf(IOException.class);

        verify(execution, times(1)).execute(any(), any());
    }

    @Test
    @DisplayName("GET 요청은 IOException 발생 시 최대 3회까지 재시도한다")
    void getRequest_retriesUpToMaxAttemptsOnIOException() throws IOException {
        HttpRequest request = mockRequest(HttpMethod.GET);
        ClientHttpResponse okResponse = mock(ClientHttpResponse.class);
        given(okResponse.getStatusCode()).willReturn(HttpStatus.OK);

        AtomicInteger attempts = new AtomicInteger();
        ClientHttpRequestExecution execution = (req, body) -> {
            if (attempts.incrementAndGet() < 3) {
                throw new IOException("temporary network error");
            }
            return okResponse;
        };

        ClientHttpResponse response = interceptor.intercept(request, new byte[0], execution);

        assertThat(attempts.get()).isEqualTo(3);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    private HttpRequest mockRequest(HttpMethod method) {
        return new MockClientHttpRequest(method, URI.create("http://localhost:8080/test"));
    }
}
