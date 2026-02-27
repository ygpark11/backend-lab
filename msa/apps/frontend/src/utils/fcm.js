import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import client from "../api/client";
import * as Sentry from "@sentry/react"; // Sentry 활용을 위해 추가

export { isSupported };

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export const requestFcmToken = async () => {
    try {
        const supported = await isSupported();
        if (!supported) {
            // console.warn("[FCM] 미지원 브라우저"); // 불필요한 경고 주석 처리
            return;
        }

        const messaging = getMessaging(app);

        if (typeof window !== "undefined" && "Notification" in window) {
            const permission = await Notification.requestPermission();
            if (permission !== "granted") return; // 거부된 경우 조용히 종료

            const token = await getToken(messaging, { vapidKey: VAPID_KEY });
            if (!token) return;

            // 성공 로그는 개발 중에만 필요하므로 주석 처리
            // console.log("[FCM] Token 발급 성공:", token);

            await client.post("/api/notifications/token", { token });
        }
    } catch (error) {
        Sentry.captureException(error);
        console.error("[FCM] 설정 중 오류 발생");
    }
};

export const onForegroundMessage = async () => {
    try {
        const supported = await isSupported();
        if (!supported) return;

        const messaging = getMessaging(app);
        onMessage(messaging, (payload) => {
            // 포그라운드 메시지 도착 시 로직 (필요할 때만 로그 출력)
            // console.log("[FCM] 알림 도착:", payload);
        });
    } catch (error) {
        Sentry.captureException(error);
    }
};