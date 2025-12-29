package com.pstracker.catalog_service.notification.service;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import org.springframework.stereotype.Service;

@Service
public class FcmService {

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
            System.out.println("✅ 알림 전송 성공! Message ID: " + response);

        } catch (Exception e) {
            System.err.println("❌ 알림 전송 실패: " + e.getMessage());
            e.printStackTrace();
        }
    }
}