package com.pstracker.catalog_service.global.client.collector;

import com.pstracker.catalog_service.global.client.collector.dto.ScrapingQueueRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;

import java.util.List;

/**
 * 다중 수집기 인스턴스 라우팅 및 폴백 관리.
 * 클라이언트 생성은 HttpClientConfig에서 담당하며, 이 클래스는 라우팅 로직만 보유.
 */
@Slf4j
@RequiredArgsConstructor
public class CollectorClientManager {

    private final List<CollectorApiClient> clients;

    /** 전체 수집기 인스턴스 목록 */
    public List<CollectorApiClient> getAll() {
        return clients;
    }

    /** 주 수집기 — 단건 수집 등 특정 인스턴스 지정이 필요한 경우 */
    public CollectorApiClient getPrimary() {
        return clients.getFirst();
    }

    /**
     * VIP 요청 전송 (폴백 포함).
     * 주 수집기가 409(바쁨) 또는 연결 불가 시 다음 인스턴스로 순차 시도.
     * 모든 인스턴스 실패 시 에러 로그만 남기고 조용히 실패 (요청은 DB에 남아 재시도됨).
     */
    public void triggerVipWithFallback(ScrapingQueueRequest request) {
        for (int i = 0; i < clients.size(); i++) {
            try {
                clients.get(i).triggerScrapingQueue(request);
                log.debug("VIP 요청 전송 성공 — 수집기 #{} (psStoreId: {})", i, request.psStoreId());
                return;
            } catch (HttpClientErrorException e) {
                if (e.getStatusCode().value() == 409) {
                    log.warn("수집기 #{} 작업 중 (409), 다음 인스턴스 시도...", i);
                } else {
                    throw e;
                }
            } catch (ResourceAccessException e) {
                log.warn("수집기 #{} 연결 실패, 다음 인스턴스 시도... ({})", i, e.getMessage());
            }
        }
        log.error("모든 수집기 인스턴스가 바쁘거나 응답 없음 — VIP 요청 전송 실패 (psStoreId: {})", request.psStoreId());
    }
}
