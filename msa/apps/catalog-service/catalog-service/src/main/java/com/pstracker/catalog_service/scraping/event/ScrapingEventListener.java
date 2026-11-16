package com.pstracker.catalog_service.scraping.event;

import com.pstracker.catalog_service.notification.domain.FcmToken;
import com.pstracker.catalog_service.notification.repository.FcmTokenRepository;
import com.pstracker.catalog_service.notification.service.FcmService;
import com.pstracker.catalog_service.scraping.service.ScrapingWebhookService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class ScrapingEventListener {

    private final ScrapingWebhookService scrapingWebhookService;
    private final FcmService fcmService;
    private final FcmTokenRepository fcmTokenRepository;

    @Async
    @TransactionalEventListener
    public void handlePioneerScrapingCompletedEvent(PioneerScrapingCompletedEvent event) {
        log.info("[이벤트 수신] 개척자 수집 완료 처리 시작 - psStoreId: {}, member: {}",
                event.psStoreId(), event.memberNickname());

        try {
            // DB 업데이트만 독립 트랜잭션으로 커밋한 뒤, FCM HTTP I/O 동안 DB 커넥션을 점유하지 않는다.
            String gameName = scrapingWebhookService.assignPioneerAndGetGameName(
                    event.psStoreId(), event.memberId(), event.memberNickname());
            log.debug("개척자 칭호 부여 완료: [{}] -> {}", gameName, event.memberNickname());

            String title = "수집 완료!";
            String body = "요청하신 [" + gameName + "] 게임이 트래커 진열장에 등록되었습니다. 지금 바로 확인해보세요!";

            List<FcmToken> tokens = fcmTokenRepository.findAllByMemberIdInWithMember(List.of(event.memberId()));
            if (tokens.isEmpty()) {
                log.debug("FCM tokens not found. Skipping push.");
                return;
            }

            Map<String, String> fcmData = Map.of("url", "/games");

            fcmService.sendMulticastMessage(tokens, title, body, fcmData);
            log.debug("개척자({})에게 FCM 알림 발송 완료", event.memberNickname());

        } catch (Exception e) {
            log.error("개척자 수집 완료 이벤트 처리 중 치명적 에러 발생", e);
        }
    }

    @Async
    @TransactionalEventListener
    public void handleCrawlerErrorEvent(CrawlerErrorEvent event) {
        log.error("[이벤트 수신] 크롤러 수집 실패 알림 - Source: {}, Message: {}",
                event.source(), event.errorMessage());
    }
}
