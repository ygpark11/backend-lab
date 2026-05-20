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

// 6. 알림 클릭 이벤트 리스너 (모바일 PWA 포커스 최적화 버전)
self.addEventListener('notificationclick', function(event) {
    console.debug('[SW] 알림 클릭: ', event.notification);
    event.notification.close();

    let relativeUrl = '/';
    if (event.notification.data?.url) {
        relativeUrl = event.notification.data.url;
    } else if (event.notification.data?.FCM_MSG?.notification?.click_action) {
        relativeUrl = event.notification.data.FCM_MSG.notification.click_action;
    }

    const isSafeUrl = relativeUrl.startsWith('/') || relativeUrl.startsWith(self.location.origin);
    if (!isSafeUrl) {
        console.warn(`[SW] 🚨 보안 경고: 허용되지 않은 외부 URL(${relativeUrl})은 차단하고 메인으로 이동합니다.`);
        relativeUrl = '/';
    }
    
    const absoluteUrl = new URL(relativeUrl, self.location.origin).href;
    console.debug(`[SW] 최종 이동 URL: ${absoluteUrl}`);

    const promiseChain = clients.matchAll({
        type: 'window',
        includeUncontrolled: true
    }).then((windowClients) => {
        let existingClient = null;

        for (let i = 0; i < windowClients.length; i++) {
            const client = windowClients[i];
            if (client.url.startsWith(self.location.origin) && 'focus' in client) {
                existingClient = client;
                break;
            }
        }

        if (existingClient) {
            return existingClient.focus().then((client) => {
                if (client) {
                    return client.navigate(absoluteUrl);
                }
            });
        }
        
        // 백그라운드에 아예 앱이 안 켜져있다면 새로 연다.
        if (clients.openWindow) {
            return clients.openWindow(absoluteUrl);
        }
    });

    event.waitUntil(promiseChain);
});