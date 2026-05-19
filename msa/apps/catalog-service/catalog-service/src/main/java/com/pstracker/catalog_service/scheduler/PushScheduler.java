package com.pstracker.catalog_service.scheduler;

import com.pstracker.catalog_service.insights.service.InsightsService;
import com.pstracker.catalog_service.notification.domain.FcmToken;
import com.pstracker.catalog_service.notification.repository.FcmTokenRepository;
import com.pstracker.catalog_service.notification.service.FcmService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class PushScheduler {

    private final InsightsService insightsService;
    private final FcmService fcmService;
    private final FcmTokenRepository fcmTokenRepository;

    /**
     * 마감 임박 (Closing Soon) 알림 발송
     * 매일 오후 7시 실행
     */
    @Scheduled(cron = "0 0 19 * * *", zone = "Asia/Seoul")
    public void sendClosingSoonPush() {
        log.info("마감 임박 게임 푸시 알림 스케줄러 실행");
        long closingSoonCount = insightsService.getClosingSoonCount();

        if (closingSoonCount > 0) {
            String title = "할인 마감 임박!";
            String body = String.format("오늘 또는 내일 할인이 종료되는 게임이 %d개 있습니다. 기회를 놓치지 마세요!", closingSoonCount);
            
            List<FcmToken> allTokens = fcmTokenRepository.findAllWithMember();
            if (!allTokens.isEmpty()) {
                Map<String, String> fcmData = Map.of("url", "/games?isClosingSoon=true");

                fcmService.sendMulticastMessage(allTokens, title, body, fcmData);
                log.info("마감 임박 푸시 발송 완료 (대상자: {}명)", allTokens.size());
            } else {
                log.info("발송 가능한 FCM 토큰이 없습니다.");
            }
        } else {
            log.info("마감 임박 게임이 없어 푸시를 발송하지 않습니다.");
        }
    }

    /**
     * 신규 할인 (New Discount) 알림 발송
     * 매일 오후 3시 실행
     */
    @Scheduled(cron = "0 0 15 * * *", zone = "Asia/Seoul")
    public void sendNewDiscountPush() {
        log.info("신규 할인 게임 푸시 알림 스케줄러 실행");
        long newDiscountCount = insightsService.getNewDiscountCount();

        if (newDiscountCount > 0) {
            String title = "새로운 할인이 시작되었습니다!";
            String body = String.format("오늘 새롭게 %d개의 게임이 할인을 시작했습니다. 지금 바로 확인해보세요!", newDiscountCount);
            
            List<FcmToken> allTokens = fcmTokenRepository.findAllWithMember();
            if (!allTokens.isEmpty()) {
                Map<String, String> fcmData = Map.of("url", "/games?isNewDiscount=true");

                fcmService.sendMulticastMessage(allTokens, title, body, fcmData);
                log.info("신규 할인 푸시 발송 완료 (대상자: {}명)", allTokens.size());
            } else {
                log.info("발송 가능한 FCM 토큰이 없습니다.");
            }
        } else {
            log.info("ℹ오늘 새롭게 할인이 시작된 게임이 없어 푸시를 발송하지 않습니다.");
        }
    }
}
