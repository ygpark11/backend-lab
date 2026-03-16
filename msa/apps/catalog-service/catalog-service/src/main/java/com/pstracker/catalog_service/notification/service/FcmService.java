package com.pstracker.catalog_service.notification.service;

import com.google.firebase.messaging.*;
import com.pstracker.catalog_service.notification.domain.FcmToken;
import com.pstracker.catalog_service.notification.repository.FcmTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class FcmService {

    private final FcmTokenRepository fcmTokenRepository;

    public void sendMessage(String token, String title, String body) {
        try {
            Notification notification = Notification.builder()
                    .setTitle(title)
                    .setBody(body)
                    .build();

            Message message = Message.builder()
                    .setToken(token)
                    .setNotification(notification)
                    .build();

            String response = FirebaseMessaging.getInstance().send(message);
            log.info("Sent message with response={}", response);

        } catch (Exception e) {
            log.error("Error sending notification", e);
        }
    }

    public void sendMulticastMessage(List<FcmToken> fcmTokens, String title, String body) {
        if (fcmTokens == null || fcmTokens.isEmpty()) return;

        // 현재 한국 시간 기준으로 야간 시간대(22:00 ~ 08:00)인지 판별
        LocalTime now = LocalTime.now(ZoneId.of("Asia/Seoul"));
        boolean isNightTime = now.isAfter(LocalTime.of(22, 0)) || now.isBefore(LocalTime.of(8, 0));

        // 야간 시간이라면, '야간 스텔스 모드를 켜지 않은(false)' 유저의 토큰만 필터링
        List<FcmToken> targetTokens = fcmTokens;
        if (isNightTime) {
            targetTokens = fcmTokens.stream()
                    .filter(token -> !token.getMember().isNightModeEnabled()) // FcmToken의 Member 엔티티 참조
                    .toList();
            log.debug("야간 스텔스 모드 발동: 총 {}명 중 {}명에게만 푸시 발송", fcmTokens.size(), targetTokens.size());
        }

        if (targetTokens.isEmpty()) {
            log.debug("모든 대상이 야간 스텔스 모드 중입니다. 발송을 취소합니다.");
            return;
        }

        List<String> tokens = targetTokens.stream().map(FcmToken::getToken).toList();
        List<FcmToken> deadTokens = new ArrayList<>();

        // FCM은 한 번에 최대 500개의 토큰만 전송 가능 -> 500개씩 청크(Chunk) 분할
        int batchSize = 500;
        for (int i = 0; i < tokens.size(); i += batchSize) {
            int endIndex = Math.min(i + batchSize, tokens.size());
            List<String> batchTokens = tokens.subList(i, endIndex);
            List<FcmToken> batchFcmTokens = targetTokens.subList(i, endIndex); // targetTokens 사용

            MulticastMessage message = MulticastMessage.builder()
                    .addAllTokens(batchTokens)
                    .setNotification(com.google.firebase.messaging.Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build())
                    .build();

            try {
                BatchResponse response = FirebaseMessaging.getInstance().sendEachForMulticast(message);
                log.info("📨 [FCM Batch] 발송 성공: {}, 실패: {}", response.getSuccessCount(), response.getFailureCount());

                if (response.getFailureCount() > 0) {
                    List<SendResponse> responses = response.getResponses();
                    for (int j = 0; j < responses.size(); j++) {
                        if (!responses.get(j).isSuccessful()) {
                            String errorCode = responses.get(j).getException().getMessagingErrorCode().name();
                            if ("UNREGISTERED".equals(errorCode) || "INVALID_ARGUMENT".equals(errorCode)) {
                                deadTokens.add(batchFcmTokens.get(j));
                            }
                        }
                    }
                }
            } catch (Exception e) {
                log.error("❌ FCM Multicast 전송 실패", e);
            }
        }

        // 수명이 다한 좀비 토큰 DB에서 일괄 삭제
        if (!deadTokens.isEmpty()) {
            fcmTokenRepository.deleteAll(deadTokens);
            log.debug("🧹 수명이 다한 FCM 토큰 {}개를 DB에서 삭제했습니다.", deadTokens.size());
        }
    }
}