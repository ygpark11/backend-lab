package com.pstracker.catalog_service.global.client.config;

import com.pstracker.catalog_service.global.client.collector.CollectorApiClient;
import com.pstracker.catalog_service.global.client.collector.CollectorClientManager;
import com.pstracker.catalog_service.global.client.gemini.GeminiApiClient;
import com.pstracker.catalog_service.global.client.igdb.IgdbAuthClient;
import com.pstracker.catalog_service.global.client.igdb.IgdbGameClient;
import com.pstracker.catalog_service.global.client.interceptor.LoggingAndRetryInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * 외부 API 연동을 위한 @HttpExchange 클라이언트 빈 설정
 * - 각 외부 시스템별로 전용 RestClient + HttpServiceProxyFactory를 생성하여 독립 설정 보장
 * - 모든 클라이언트에 LoggingAndRetryInterceptor 적용 (요청/응답 로깅, IOException 재시도)
 * - Gemini는 AI 응답 특성상 별도의 넉넉한 읽기 타임아웃 적용
 */
@Configuration
public class HttpClientConfig {

    @Value("${igdb.auth-url}")
    private String igdbAuthUrl;

    @Value("${igdb.api-url}")
    private String igdbApiUrl;

    @Value("${crawler.primary-url}")
    private String crawlerPrimaryUrl;

    @Value("${crawler.secondary-url:}")
    private String crawlerSecondaryUrl;

    private static final int CONNECT_TIMEOUT_SECONDS = 5;
    private static final int DEFAULT_READ_TIMEOUT_SECONDS = 30;
    private static final int GEMINI_READ_TIMEOUT_SECONDS = 120;

    @Bean
    public IgdbAuthClient igdbAuthClient() {
        RestClient restClient = baseBuilder(CONNECT_TIMEOUT_SECONDS, DEFAULT_READ_TIMEOUT_SECONDS)
                .baseUrl(igdbAuthUrl)
                .build();
        return HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(restClient))
                .build()
                .createClient(IgdbAuthClient.class);
    }

    @Bean
    public IgdbGameClient igdbGameClient() {
        RestClient restClient = baseBuilder(CONNECT_TIMEOUT_SECONDS, DEFAULT_READ_TIMEOUT_SECONDS)
                .baseUrl(igdbApiUrl)
                .build();
        return HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(restClient))
                .build()
                .createClient(IgdbGameClient.class);
    }

    @Bean
    public GeminiApiClient geminiApiClient() {
        RestClient restClient = baseBuilder(CONNECT_TIMEOUT_SECONDS, GEMINI_READ_TIMEOUT_SECONDS)
                .baseUrl("https://generativelanguage.googleapis.com")
                .build();
        return HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(restClient))
                .build()
                .createClient(GeminiApiClient.class);
    }

    @Bean
    public CollectorClientManager collectorClientManager() {
        List<CollectorApiClient> clients = new ArrayList<>();
        clients.add(createCollectorClient(crawlerPrimaryUrl));
        if (crawlerSecondaryUrl != null && !crawlerSecondaryUrl.isBlank()) {
            clients.add(createCollectorClient(crawlerSecondaryUrl));
        }
        return new CollectorClientManager(clients);
    }

    private CollectorApiClient createCollectorClient(String baseUrl) {
        RestClient restClient = baseBuilder(CONNECT_TIMEOUT_SECONDS, DEFAULT_READ_TIMEOUT_SECONDS)
                .baseUrl(baseUrl)
                .build();
        return HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(restClient))
                .build()
                .createClient(CollectorApiClient.class);
    }

    /**
     * 공용 RestClient.Builder 팩토리 메서드
     * - 매번 새 인스턴스를 반환하여 빌더 상태 공유로 인한 설정 오염 방지
     */
    private RestClient.Builder baseBuilder(int connectTimeoutSeconds, int readTimeoutSeconds) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(connectTimeoutSeconds));
        factory.setReadTimeout(Duration.ofSeconds(readTimeoutSeconds));

        return RestClient.builder()
                .requestFactory(factory)
                .requestInterceptor(new LoggingAndRetryInterceptor());
    }
}
