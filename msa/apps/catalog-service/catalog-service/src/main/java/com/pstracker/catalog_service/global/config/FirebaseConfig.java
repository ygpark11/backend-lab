package com.pstracker.catalog_service.global.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.springframework.context.annotation.Configuration;

import javax.annotation.PostConstruct;
import java.io.FileInputStream;
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

            InputStream serviceAccount = null;
            // 1. 환경변수에서 경로 확인 (운영 서버용)
            String configPath = System.getenv("FIREBASE_CONFIG_PATH");

            // 환경변수에 경로가 있고 파일이 존재하면 읽기
            if (configPath != null && !configPath.isEmpty()) {
                try {
                    serviceAccount = new FileInputStream(configPath);
                    System.out.println("🔥 Firebase 설정 로드 (외부 파일): " + configPath);
                } catch (IOException e) {
                    System.err.println("⚠️ 외부 파일 로드 실패, 내부 리소스를 찾습니다. (" + e.getMessage() + ")");
                }
            }

            // 외부 파일이 없으면 내부 resources 폴더 확인 (로컬 개발용)
            if (serviceAccount == null) {
                serviceAccount = getClass().getResourceAsStream("/firebase-service-account.json");
                if (serviceAccount != null) {
                    System.out.println("🔥 Firebase 설정 로드 (내부 리소스)");
                }
            }

            // 파일을 못 찾았으면 예외 처리
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