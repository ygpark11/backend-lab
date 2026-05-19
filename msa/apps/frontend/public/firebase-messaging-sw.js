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

    // 방어 로직: payload.notification이 "없을 때만" 직접 알림을 띄우도록 (중복 방지)
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
    console.debug('[SW] 알림 클릭: ', event.notification);
    event.notification.close();

    let targetUrl = '/';
    if (event.notification.data?.url) {
        targetUrl = event.notification.data.url;
    } else if (event.notification.data?.FCM_MSG?.notification?.click_action) {
        targetUrl = event.notification.data.FCM_MSG.notification.click_action;
    }

    // URL이 우리 사이트 내부 경로인지 확인
    const isSafeUrl = targetUrl.startsWith('/') || targetUrl.startsWith(self.location.origin);
    if (!isSafeUrl) {
        console.warn(`[SW] 보안 경고: 허용되지 않은 외부 URL(${targetUrl})은 차단하고 메인으로 이동합니다.`);
        targetUrl = '/'; // 안전하지 않은 URL이면 무조건 메인 화면으로 리디렉션
    }
    
    console.debug(`[SW] 최종 이동 URL: ${targetUrl}`);

    const promiseChain = clients.matchAll({
        type: 'window',
        includeUncontrolled: true
    }).then((windowClients) => {
        // 이미 열려있는 탭이 있는지 확인하고, 있다면 해당 탭을 재사용합니다.
        const existingClient = windowClients.find(
            (client) => client.url.startsWith(self.location.origin) && 'focus' in client
        );

        if (existingClient) {
            // 기존 탭을 찾았으면, 해당 탭으로 이동하고 포커스를 줍니다.
            return existingClient.navigate(targetUrl).then((client) => client.focus());
        }
        
        // 열려있는 탭이 없다면, 새 탭을 엽니다.
        if (clients.openWindow) {
            return clients.openWindow(targetUrl);
        }
    });

    event.waitUntil(promiseChain);
});
