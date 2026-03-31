// public/firebase-messaging-sw.js

// 1. Firebase 스크립트 가져오기 (CDN 방식)
importScripts('https://www.gstatic.com/firebasejs/9.2.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.2.0/firebase-messaging-compat.js');

// 2. Firebase 설정 (환경 변수 대신 직접 입력)
const firebaseConfig = {
    apiKey: "AIzaSyBSKbkUpFaEa9ajeujv5H04o59SfxBeZ7A",        // .env의 VITE_FIREBASE_API_KEY 값
    authDomain: "ps-tracker-bd58e.firebaseapp.com",           // .env의 VITE_FIREBASE_AUTH_DOMAIN 값
    projectId: "ps-tracker-bd58e",                            // .env의 VITE_FIREBASE_PROJECT_ID 값
    storageBucket: "ps-tracker-bd58e.firebasestorage.app",    // .env의 VITE_FIREBASE_STORAGE_BUCKET 값
    messagingSenderId: "828557075044",                        // .env의 VITE_FIREBASE_MESSAGING_SENDER_ID 값
    appId: "1:828557075044:web:439f0eddbfdbb326f6b571",       // .env의 VITE_FIREBASE_APP_ID 값
    measurementId: "G-8ND7D4JGH5"                             // .env의 VITE_FIREBASE_MEASUREMENT_ID 값
};

// 3. 초기화
firebase.initializeApp(firebaseConfig);

// 4. 메시징 객체
const messaging = firebase.messaging();

// 5. 백그라운드 메시지 수신 리스너
messaging.onBackgroundMessage((payload) => {
    console.debug('[SW] 백그라운드 메시지 수신:', payload);

    // 🛡방어 로직: payload.notification이 "없을 때만" 직접 알림을 띄우도록 (중복 방지)
    // (notification이 있으면 Firebase가 알아서 띄우므로 중복 방지)
    if (!payload.notification) {
        // 백엔드에서 data 페이로드만 보냈을 경우를 대비한 추출
        const notificationTitle = payload.data?.title || 'PS Tracker';
        const notificationOptions = {
            body: payload.data?.body || '새로운 알림이 도착했습니다.',
            icon: '/favicon.ico',
        };

        self.registration.showNotification(notificationTitle, notificationOptions);
    }

});