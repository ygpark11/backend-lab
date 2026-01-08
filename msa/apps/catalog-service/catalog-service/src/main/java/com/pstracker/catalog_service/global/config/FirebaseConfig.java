package com.pstracker.catalog_service.global.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import javax.annotation.PostConstruct;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;

@Configuration
@Slf4j
public class FirebaseConfig {

    @PostConstruct
    public void init() {
        if (!FirebaseApp.getApps().isEmpty()) {
            return;
        }

        try {
            GoogleCredentials credentials = loadCredentials();

            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(credentials)
                    .build();

            FirebaseApp.initializeApp(options);
            log.info("🔥 Firebase Admin SDK 초기화 성공!");
        } catch (IOException e) {
            log.error("❌ Firebase 초기화 중 오류 발생: {}", e.getMessage(), e);
        }
    }

    private GoogleCredentials loadCredentials() throws IOException {
        String configPath = System.getenv("FIREBASE_CONFIG_PATH");

        if (configPath != null && !configPath.isEmpty()) {
            try (InputStream in = new FileInputStream(configPath)) {
                log.info("🔥 Firebase 설정 로드 (외부 파일): {}", configPath);
                return GoogleCredentials.fromStream(in);
            } catch (IOException e) {
                log.error("⚠️ 외부 파일 로드 실패, 내부 리소스를 찾습니다. : {}", e.getMessage(), e);
            }
        }

        // 내부 리소스 시도
        ClassPathResource resource = new ClassPathResource("firebase-service-account.json");
        if (!resource.exists()) {
            throw new IOException("`firebase-service-account.json` 파일을 찾을 수 없습니다.");
        }

        try (InputStream in = resource.getInputStream()) {
            log.info("🔥 Firebase 설정 로드 (내부 리소스)");
            return GoogleCredentials.fromStream(in);
        }
    }
}