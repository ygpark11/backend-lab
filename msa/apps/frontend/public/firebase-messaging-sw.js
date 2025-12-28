// public/firebase-messaging-sw.js

// 1. Firebase 스크립트 가져오기 (CDN 방식)
importScripts('https://www.gstatic.com/firebasejs/9.2.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.2.0/firebase-messaging-compat.js');

// 2. Firebase 설정 (여기는 .env가 안 먹히니, 아까 그 값들을 직접 넣어주세요!)
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
    console.log('[SW] 백그라운드 메시지 수신:', payload);

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/favicon.ico', // 아이콘 경로 (public 폴더 기준)
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});