import {initializeApp} from "firebase/app";
import {getMessaging, getToken, onMessage} from "firebase/messaging";
import client from "../api/client";

// 1. .env에서 설정값 가져오기
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// 2. 앱 초기화
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// 3. VAPID Key (.env에서 가져오기)
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/**
 * 🚀 권한 요청 및 토큰 발급 -> 백엔드 전송
 */
export const requestFcmToken = async () => {
    try {
        // 1) 알림 권한 요청
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
            console.warn("[FCM] 알림 권한이 거부되었습니다.");
            return;
        }

        // 2) FCM 토큰 발급
        const token = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (!token) {
            console.error("[FCM] 토큰을 가져올 수 없습니다.");
            return;
        }

        console.log("[FCM] Token 발급 성공:", token);

        // 3) 백엔드 서버에 등록 (client.js가 자동으로 헤더에 JWT를 붙여줌)
        // DTO가 { token: "..." } 형태이므로 객체로 감싸서 보냄
        await client.post("/api/notifications/token", { token });
        console.log("[FCM] 서버에 토큰 등록 완료!");

    } catch (error) {
        console.error("[FCM] 설정 중 오류 발생:", error);
    }
};

/**
 * 🔔 포그라운드 메시지 수신 (앱을 켜놓고 있을 때)
 */
export const onForegroundMessage = () => {
    onMessage(messaging, (payload) => {
        console.log("[FCM] 포그라운드 알림 도착:", payload);
        // 여기서 필요한 경우 커스텀 UI(Toast 등)를 띄울 수 있음
        // 예: alert(payload.notification.title);
    });
};