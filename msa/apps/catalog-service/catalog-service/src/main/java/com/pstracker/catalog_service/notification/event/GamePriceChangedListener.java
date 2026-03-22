package com.pstracker.catalog_service.notification.event;

import com.pstracker.catalog_service.catalog.domain.Wishlist;
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

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

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

        Long gameId = event.getGameId();

        List<Wishlist> wishlists = wishlistRepository.findAllByGameIdWithMember(gameId);

        if (wishlists.isEmpty()) return;

        String shortGameName = event.getGameName().length() > 20
                ? event.getGameName().substring(0, 20) + "..."
                : event.getGameName();

        List<Notification> notificationsToSave = new ArrayList<>();
        List<Member> fcmTargetMembers = new ArrayList<>();
        List<String> fcmTitles = new ArrayList<>();
        List<String> fcmBodies = new ArrayList<>();

        for (Wishlist wish : wishlists) {
            Member member = wish.getMember();
            Integer targetPrice = wish.getTargetPrice();
            int currentPrice = event.getNewPrice();

            String dbTitle = "";
            String pushTitle = "";
            String message = "";

            if (targetPrice != null && targetPrice > 0) {
                if (currentPrice <= targetPrice) {
                    // 시나리오 A: 현재가가 목표가 도달
                    dbTitle = "[목표 가격 도달] " + event.getGameName();
                    pushTitle = "목표 가격 도달! " + shortGameName;
                    message = String.format("드디어 목표가(%s원)에 도달했습니다! 현재가: %s원.",
                            String.format("%,d", targetPrice), String.format("%,d", currentPrice));
                } else {
                    // 시나리오 B: 할인은 했지만 목표가보단 비쌈
                    dbTitle = "[할인 시작] " + event.getGameName();
                    pushTitle = "할인이 시작되었어요! " + shortGameName;
                    message = String.format("목표가(%s원)까진 아직 멀었지만, 현재 %s원(%d%% 할인)으로 떨어졌습니다.",
                            String.format("%,d", targetPrice), String.format("%,d", currentPrice), event.getDiscountRate());
                }
            } else {
                // 시나리오 C: 일반 찜 (목표가 없음)
                dbTitle = "[가격 하락] " + event.getGameName();
                pushTitle = "가격 하락! " + shortGameName;
                message = String.format("가격이 %s원으로 내려갔어요! (%d%% 할인)",
                        String.format("%,d", currentPrice), event.getDiscountRate());
            }

            notificationsToSave.add(Notification.create(member, dbTitle, message, gameId));

            if (member.isPriceAlertEnabled()) {
                fcmTargetMembers.add(member);
                fcmTitles.add(pushTitle);
                fcmBodies.add(message);
            }
        }

        notificationRepository.saveAll(notificationsToSave);

        if (!fcmTargetMembers.isEmpty()) {
            List<Long> targetMemberIds = fcmTargetMembers.stream().map(Member::getId).toList();

            List<FcmToken> allTokens = fcmTokenRepository.findAllByMemberIdInWithMember(targetMemberIds);

            Map<Long, List<FcmToken>> tokenMap = allTokens.stream()
                    .collect(java.util.stream.Collectors.groupingBy(t -> t.getMember().getId()));

            for (int i = 0; i < fcmTargetMembers.size(); i++) {
                Member member = fcmTargetMembers.get(i);
                List<FcmToken> memberTokens = tokenMap.getOrDefault(member.getId(), new java.util.ArrayList<>());

                if (!memberTokens.isEmpty()) {
                    try {
                        fcmService.sendMulticastMessage(memberTokens, fcmTitles.get(i), fcmBodies.get(i));
                    } catch (Exception e) {
                        log.error("❌ Failed to send FCM for Member {}: {}", member.getId(), e.getMessage());
                    }
                }
            }
        }
    }
}