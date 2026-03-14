package com.pstracker.catalog_service.scraping.event;

import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.repository.GameRepository;
import com.pstracker.catalog_service.notification.domain.FcmToken;
import com.pstracker.catalog_service.notification.repository.FcmTokenRepository;
import com.pstracker.catalog_service.notification.service.FcmService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class ScrapingEventListener {

    private final GameRepository gameRepository;
    private final FcmService fcmService;
    private final FcmTokenRepository  fcmTokenRepository;

    @Async
    @Transactional
    @EventListener
    public void handlePioneerScrapingCompletedEvent(PioneerScrapingCompletedEvent event) {
        log.info("[이벤트 수신] 개척자 수집 완료 처리 시작 - psStoreId: {}, member: {}",
                event.getPsStoreId(), event.getMember().getNickname());

        try {
            // 1. 크롤러가 방금 DB에 밀어넣은(저장한) 게임 엔티티 조회
            Game game = gameRepository.findByPsStoreId(event.getPsStoreId())
                    .orElseThrow(() -> new IllegalArgumentException("수집 완료 콜백을 받았으나 DB에서 게임을 찾을 수 없습니다: " + event.getPsStoreId()));

            // 2. 개척자 명예의 전당 기록 (※ Game 엔티티에 pioneerName 필드와 update 메서드가 추가되어야 동작합니다)
            game.updatePioneerName(event.getMember().getNickname());
            log.debug("👑 개척자 칭호 부여 완료: [{}] -> {}", game.getName(), event.getMember().getNickname());

            // 3. 해당 유저에게 FCM 푸시 알림 단건 발송
            String title = "수집 완료! 🎮";
            String body = "요청하신 [" + game.getName() + "] 게임이 트래커 진열장에 등록되었습니다. 지금 바로 확인해보세요!";

            Optional<FcmToken> token = fcmTokenRepository.findByMember(event.getMember());
            if(token.isEmpty()) {
                log.debug("FCM tokens found. Skipping push.");
                return;
            }

            fcmService.sendMessage(token.get().getToken(), title, body);
            log.debug("🚀 개척자({})에게 FCM 알림 발송 완료", event.getMember().getNickname());

        } catch (Exception e) {
            log.error("개척자 수집 완료 이벤트 처리 중 치명적 에러 발생", e);
        }
    }

    @Async
    @EventListener
    public void handleCrawlerErrorEvent(CrawlerErrorEvent event) {
        log.error("[이벤트 수신] 크롤러 수집 실패 알림 - Source: {}, Message: {}",
                event.getSource(), event.getErrorMessage());
    }
}
