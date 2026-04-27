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
    if (!payload.notification) {
        const notificationTitle = payload.data?.title || 'PS Tracker';
        const notificationOptions = {
            body: payload.data?.body || '새로운 알림이 도착했습니다.',
            icon: '/favicon.ico',
            data: {
                url: payload.data?.url || '/'
            }
        };

        self.registration.showNotification(notificationTitle, notificationOptions);
    }
});

// 6. 알림 클릭 시 화면 이동을 처리하는 이벤트 리스너
self.addEventListener('notificationclick', function(event) {
    console.debug('[SW] 알림 클릭됨!', event);

    // 1. 클릭한 알림 창 닫기
    event.notification.close();

    // 2. 백엔드에서 넘겨준 이동할 URL 추출
    // (Firebase가 자동 생성한 알림의 경우 FCM_MSG 내부에 데이터가 있을 수 있음)
    let targetUrl = '/';
    if (event.notification.data && event.notification.data.FCM_MSG && event.notification.data.FCM_MSG.data && event.notification.data.FCM_MSG.data.url) {
        targetUrl = event.notification.data.FCM_MSG.data.url;
    } else if (event.notification.data && event.notification.data.url) {
        targetUrl = event.notification.data.url;
    }

    const isSafeUrl = targetUrl.startsWith('/') || targetUrl.startsWith(self.location.origin);

    if (!isSafeUrl) {
        console.warn('[SW] 🚨 보안 경고: 허용되지 않은 외부 URL 차단됨 ->', targetUrl);
        targetUrl = '/'; // 악성 URL이면 무조건 메인 화면으로 튕겨버림
    }

    // 3. 브라우저 탭 이동 로직
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
            // 이미 열려있는 PS Tracker 창(탭)이 있는지 확인
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.includes(self.registration.scope) && 'focus' in client) {
                    client.navigate(targetUrl); // 해당 탭을 타겟 URL로 새로고침/이동
                    return client.focus();      // 화면을 사용자 앞으로 가져옴
                }
            }
            // 열려있는 탭이 없다면 새 창 열기
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});