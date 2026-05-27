package com.pstracker.catalog_service.notification.event;

import com.pstracker.catalog_service.notification.domain.FcmToken;
import com.pstracker.catalog_service.notification.domain.Notification;
import com.pstracker.catalog_service.notification.repository.FcmTokenRepository;
import com.pstracker.catalog_service.notification.repository.NotificationRepository;
import com.pstracker.catalog_service.notification.service.FcmService;
import com.pstracker.catalog_service.subscription.event.PsPlusDiscountEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class PsPlusDiscountListener {

    private final FcmTokenRepository fcmTokenRepository;
    private final NotificationRepository notificationRepository;
    private final FcmService fcmService;

    private static final String TITLE = "PS Plus 구독 할인 시작";
    private static final String MESSAGE = "PS Plus 구독가 할인이 시작되었습니다. 지금 확인해보세요!";

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handlePsPlusDiscount(PsPlusDiscountEvent event) {
        log.info("🎉 PS Plus 할인 시작 이벤트 수신 → 전체 사용자 알림 발송");

        List<FcmToken> allTokens = fcmTokenRepository.findAllWithMember();

        if (allTokens.isEmpty()) {
            log.debug("등록된 FCM 토큰이 없어 알림을 발송하지 않습니다.");
            return;
        }

        // 멤버별로 그룹화 (한 멤버가 여러 기기 등록 가능)
        Map<Long, List<FcmToken>> tokensByMember = allTokens.stream()
                .collect(java.util.stream.Collectors.groupingBy(t -> t.getMember().getId()));

        // in-app Notification: 야간 여부 관계없이 전체 등록 (안전장치)
        List<Notification> notifications = tokensByMember.values().stream()
                .map(tokens -> tokens.get(0).getMember())
                .map(member -> Notification.create(member, TITLE, MESSAGE, null))
                .toList();
        notificationRepository.saveAll(notifications);
        log.debug("PS Plus 할인 in-app 알림 {}건 저장 완료", notifications.size());

        // FCM: sendMulticastMessage 내부에서 야간 스텔스 모드 필터링 처리
        try {
            fcmService.sendMulticastMessage(allTokens, TITLE, MESSAGE, Map.of("url", "/ps-plus"));
        } catch (Exception e) {
            log.error("❌ PS Plus FCM 발송 실패: {}", e.getMessage());
        }
    }
}
