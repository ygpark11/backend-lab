package com.pstracker.catalog_service.notification.service;

import com.google.firebase.messaging.*;
import com.pstracker.catalog_service.notification.domain.FcmToken;
import com.pstracker.catalog_service.notification.repository.FcmTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

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

        List<String> tokens = fcmTokens.stream().map(FcmToken::getToken).toList();
        List<FcmToken> deadTokens = new ArrayList<>();

        // FCM은 한 번에 최대 500개의 토큰만 전송 가능 -> 500개씩 청크(Chunk) 분할
        int batchSize = 500;
        for (int i = 0; i < tokens.size(); i += batchSize) {
            int endIndex = Math.min(i + batchSize, tokens.size());
            List<String> batchTokens = tokens.subList(i, endIndex);
            List<FcmToken> batchFcmTokens = fcmTokens.subList(i, endIndex);

            MulticastMessage message = MulticastMessage.builder()
                    .addAllTokens(batchTokens)
                    .setNotification(Notification.builder()
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
                            // 앱 삭제, 알림 차단, 만료된 토큰인 경우
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
            log.info("🧹 수명이 다한 FCM 토큰 {}개를 DB에서 삭제했습니다.", deadTokens.size());
        }
    }
}