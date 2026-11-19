package com.pstracker.catalog_service.global.security;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class InternalSecurityFilterTest {

    private final InternalSecurityFilter filter = new InternalSecurityFilter("test-internal-secret");

    @Test
    @DisplayName("내부 전용 엔드포인트(/collect, /targets, /api/internal/**)는 시크릿 헤더가 없거나 틀리면 403으로 차단한다")
    void internalEndpoints_withoutOrWrongSecret_blockedWith403() throws Exception {
        for (String uri : new String[]{
                "/api/v1/games/collect",
                "/api/v1/games/targets",
                "/api/v1/games/batch-complete",
                "/api/internal/scraping/callback"
        }) {
            MockHttpServletRequest noHeaderReq = new MockHttpServletRequest("POST", uri);
            MockHttpServletResponse noHeaderRes = new MockHttpServletResponse();
            FilterChain chain1 = mock(FilterChain.class);

            filter.doFilter(noHeaderReq, noHeaderRes, chain1);
            assertThat(noHeaderRes.getStatus()).isEqualTo(403);
            verify(chain1, never()).doFilter(noHeaderReq, noHeaderRes);

            MockHttpServletRequest wrongSecretReq = new MockHttpServletRequest("POST", uri);
            wrongSecretReq.addHeader("X-Internal-Secret", "wrong-secret");
            MockHttpServletResponse wrongSecretRes = new MockHttpServletResponse();
            FilterChain chain2 = mock(FilterChain.class);

            filter.doFilter(wrongSecretReq, wrongSecretRes, chain2);
            assertThat(wrongSecretRes.getStatus()).isEqualTo(403);
            verify(chain2, never()).doFilter(wrongSecretReq, wrongSecretRes);
        }
    }

    @Test
    @DisplayName("올바른 X-Internal-Secret 헤더가 있으면 내부 엔드포인트 요청을 통과시킨다")
    void internalEndpoints_withValidSecret_passThrough() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/v1/games/collect");
        req.addHeader("X-Internal-Secret", "test-internal-secret");
        MockHttpServletResponse res = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(req, res, chain);

        assertThat(res.getStatus()).isEqualTo(200);
        verify(chain).doFilter(req, res);
    }

    @Test
    @DisplayName("공개 API(/api/v1/games/search)는 시크릿 헤더 없이 통과한다")
    void publicEndpoint_withoutSecret_passesThrough() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/v1/games/search");
        MockHttpServletResponse res = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(req, res, chain);

        assertThat(res.getStatus()).isEqualTo(200);
        verify(chain).doFilter(req, res);
    }
}
