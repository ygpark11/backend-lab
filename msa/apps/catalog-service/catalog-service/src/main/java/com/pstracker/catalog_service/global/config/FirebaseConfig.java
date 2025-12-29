package com.pstracker.catalog_service.global.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.springframework.context.annotation.Configuration;
import javax.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;

@Configuration
public class FirebaseConfig {

    @PostConstruct
    public void init() {
        try {
            if (!FirebaseApp.getApps().isEmpty()) {
                return;
            }

            // resources 폴더 안의 키 파일 이름이 정확해야 함
            InputStream serviceAccount = getClass().getResourceAsStream("/firebase-service-account.json");

            if (serviceAccount == null) {
                throw new IOException("firebase-service-account.json 파일을 찾을 수 없습니다.");
            }

            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .build();

            FirebaseApp.initializeApp(options);
            System.out.println("🔥 Firebase Admin SDK 초기화 성공!");

        } catch (IOException e) {
            e.printStackTrace();
            System.err.println("❌ Firebase 초기화 실패: " + e.getMessage());
        }
    }
}