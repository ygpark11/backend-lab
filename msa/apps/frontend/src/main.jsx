import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { HelmetProvider } from 'react-helmet-async';

import * as Sentry from "@sentry/react";

Sentry.init({
    // ⚠️ 중요: 새로 발급된 아래 주소로 꼭 교체하세요!
    dsn: "https://467be87443783d5c8e21055fc7f6f270@o4510955597332480.ingest.us.sentry.io/4510955663458304",
    integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
    ],
    // 전량 수집 시 할당량 초과(429)로 이벤트가 버려짐 → 운영 권장 비율로 샘플링
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    // 광고 차단기로 인한 서드파티 에러 필터링
    ignoreErrors: [
        /googlesyndication/,
        /doubleclick\.net/,
        /googleadservices/,
        // Cloudflare JS Detections 인라인 스크립트(Rocket Loader 경유)의 iframe 접근 에러
        /Blocked a frame with origin/,
        // 원인 불명의 외부 코드/확장 프로그램이 던지는 값 없는 reject
        /Non-Error promise rejection captured with value: undefined/,
        // 브라우저 확장 프로그램 메시지 에러
        /Invalid call to runtime\.sendMessage/,
        // 인앱 브라우저/개인정보 보호 모드의 스토리지 접근 거부
        /Failed to read the 'localStorage' property/,
    ],
    denyUrls: [
        /pagead2\.googlesyndication\.com/,
        /adservice\.google/,
        /pagead\/js\/adsbygoogle\.js/,
        // 브라우저 확장 프로그램 스크립트
        /^chrome-extension:\/\//,
        /^moz-extension:\/\//,
        /^safari-extension:\/\//,
    ],
});
// --- Sentry 설정 끝 ---

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <HelmetProvider>
            <App />
        </HelmetProvider>
    </StrictMode>,
)