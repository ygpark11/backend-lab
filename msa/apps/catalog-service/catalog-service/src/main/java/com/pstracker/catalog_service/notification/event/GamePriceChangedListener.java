package com.pstracker.catalog_service.notification.event;

import com.pstracker.catalog_service.catalog.event.GamePriceChangedEvent;
import com.pstracker.catalog_service.catalog.repository.WishlistRepository;
import com.pstracker.catalog_service.member.domain.Member;
import com.pstracker.catalog_service.notification.domain.Notification;
import com.pstracker.catalog_service.notification.repository.NotificationRepository;
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

        // 4. 엔티티 생성 및 일괄 저장 (Bulk Insert)
        List<Notification> notifications = subscribers.stream()
                .map(member -> Notification.create(member, title, message, gameId))
                .toList();

        notificationRepository.saveAll(notifications);

        log.info("🚀 Sent notifications to {} users for '{}'", notifications.size(), event.getGameName());
    }
}