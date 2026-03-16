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
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

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
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handlePriceChange(GamePriceChangedEvent event) {
        log.debug("🔔 Event Received: Price Drop for '{}' ({} -> {})",
                event.getGameName(), event.getOldPrice(), event.getNewPrice());

        List<Member> allSubscribers = wishlistRepository.findMembersByGamePsStoreId(event.getPsStoreId());

        if (allSubscribers.isEmpty()) {
            log.debug("📭 No subscribers for '{}'. Skipping notification.", event.getGameName());
            return;
        }

        Long gameId = event.getGameId();
        String rawGameName = event.getGameName();

        String shortGameName = rawGameName.length() > 20
                ? rawGameName.substring(0, 20) + "..."
                : rawGameName;

        String dbTitle = "[가격 하락] " + rawGameName;     // 인앱 알림용
        String pushTitle = "[가격 하락] " + shortGameName; // 모바일 푸시용

        String message = String.format("가격이 %,d원으로 내려갔어요! (%d%% 할인)",
                event.getNewPrice(), event.getDiscountRate());

        List<Notification> notifications = allSubscribers.stream()
                .map(member -> Notification.create(member, dbTitle, message, gameId))
                .toList();
        notificationRepository.saveAll(notifications);
        log.debug("Saved {} in-app notifications to DB.", notifications.size());

        List<Member> alertEnabledSubscribers = allSubscribers.stream()
                .filter(Member::isPriceAlertEnabled)
                .toList();

        if (!alertEnabledSubscribers.isEmpty()) {
            sendFcmNotifications(alertEnabledSubscribers, pushTitle, message);
        } else {
            log.debug("📭 푸시 알림 대상이 없습니다 (해당 게임을 찜한 유저들이 모두 푸시를 껐습니다).");
        }
    }

    private void sendFcmNotifications(List<Member> subscribers, String title, String body) {
        try {
            List<Long> memberIds = subscribers.stream().map(Member::getId).toList();
            List<FcmToken> tokens = fcmTokenRepository.findAllByMemberIdIn(memberIds);

            if (tokens.isEmpty()) {
                log.debug("Subscribers exist, but no FCM tokens found. Skipping push.");
                return;
            }

            fcmService.sendMulticastMessage(tokens, title, body);

            log.info("🚀 Triggered FCM Multicast for {} devices (Target Members: {}, Title: {})",
                    tokens.size(), subscribers.size(), title);

        } catch (Exception e) {
            log.error("❌ Failed to send FCM notifications: {}", e.getMessage());
        }
    }
}