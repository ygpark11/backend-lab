package com.pstracker.catalog_service.notification.event;

import com.pstracker.catalog_service.catalog.event.GamePriceChangedEvent;
import com.pstracker.catalog_service.catalog.repository.WishlistRepository;
import com.pstracker.catalog_service.member.domain.Member;
import com.pstracker.catalog_service.notification.domain.FcmToken;
import com.pstracker.catalog_service.notification.domain.Notification;
import com.pstracker.catalog_service.notification.repository.FcmTokenRepository;
import com.pstracker.catalog_service.notification.repository.NotificationRepository;
import com.pstracker.catalog_service.notification.service.FcmService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class GamePriceChangedListener {

    private final WishlistRepository wishlistRepository;
    private final NotificationRepository notificationRepository;
    private final FcmTokenRepository fcmTokenRepository;
    private final FcmService fcmService;

    /**
     * 가격 하락 이벤트 수신 -> 찜한 유저들에게 알림 발송
     */
    @Async
    @EventListener
    @Transactional
    public void handlePriceChange(GamePriceChangedEvent event) {
        log.info("🔔 Event Received: Price Drop for '{}' ({} -> {})",
                event.getGameName(), event.getOldPrice(), event.getNewPrice());

        // 1. 수신자 조회 (이 게임을 찜한 사람들)
        List<Member> subscribers = wishlistRepository.findMembersByGamePsStoreId(event.getPsStoreId());

        if (subscribers.isEmpty()) {
            log.info("📭 No subscribers for '{}'. Skipping notification.", event.getGameName());
            return;
        }

        // 2. 이벤트 객체에서 게임 ID 추출
        Long gameId = event.getGameId();

        // 3. 알림 메시지 생성
        String title = "📉 [가격 하락] " + event.getGameName();
        String message = String.format("가격이 %d원으로 내려갔어요! (%d%% 할인)",
                event.getNewPrice(), event.getDiscountRate());

        // 2. [In-App] DB 알림 저장 (기존 로직)
        List<Notification> notifications = subscribers.stream()
                .map(member -> Notification.create(member, title, message, gameId))
                .toList();
        notificationRepository.saveAll(notifications);
        log.info("💾 Saved {} in-app notifications to DB.", notifications.size());

        // 3. [Push] FCM 토큰 조회 및 발송
        sendFcmNotifications(subscribers, title, message);
    }

    /**
     * FCM 알림 발송
     * @param subscribers
     * @param title
     * @param body
     */
    private void sendFcmNotifications(List<Member> subscribers, String title, String body) {
        try {
            // 3-1. 구독자들의 ID 추출
            List<Long> memberIds = subscribers.stream()
                    .map(Member::getId)
                    .toList();

            // 3-2. 해당 멤버들의 토큰 일괄 조회 (Bulk Select)
            List<FcmToken> tokens = fcmTokenRepository.findAllByMemberIdIn(memberIds);

            if (tokens.isEmpty()) {
                log.info("📭 Subscribers exist, but no FCM tokens found. Skipping push.");
                return;
            }

            // 3-3. 알림 발송 (Loop)
            // Tip: 실제 운영에선 FCM의 'MulticastMessage' 기능을 쓰면 더 효율적입니다.
            // 일단 현재 구현된 fcmService.sendMessage는 단건 발송이므로 루프를 돌립니다.
            int successCount = 0;
            for (FcmToken fcmToken : tokens) {
                fcmService.sendMessage(fcmToken.getToken(), title, body);
                successCount++;
            }

            log.info("🚀 Sent FCM Push to {} devices (Target Members: {})", successCount, subscribers.size());

        } catch (Exception e) {
            // FCM 발송 실패가 DB 저장(In-App 알림)까지 롤백시키지 않도록 로그만 찍고 넘어감
            log.error("❌ Failed to send FCM notifications: {}", e.getMessage());
        }
    }
}