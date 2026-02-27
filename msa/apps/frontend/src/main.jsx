import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { HelmetProvider } from 'react-helmet-async';

// --- 🚀 최신 Sentry 설정 (업데이트된 DSN 반영) ---
import * as Sentry from "@sentry/react";

Sentry.init({
    // ⚠️ 중요: 새로 발급된 아래 주소로 꼭 교체하세요!
    dsn: "https://467be87443783d5c8e21055fc7f6f270@o4510955597332480.ingest.us.sentry.io/4510955663458304",
    integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
});
// --- 🚀 Sentry 설정 끝 ---

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <HelmetProvider>
            <App />
        </HelmetProvider>
    </StrictMode>,
)