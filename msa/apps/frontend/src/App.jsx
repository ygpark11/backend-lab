import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import React, { useState, useEffect, Suspense } from 'react';
import RouteChangeTracker from "./components/common/RouteChangeTracker";
import { Toaster } from 'react-hot-toast';
import PSLoader from './components/PSLoader';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginModal from './components/LoginModal';
import BootingScreen from './components/BootingScreen';
import GameListPage from './pages/GameListPage';
import { lazyWithReload } from './utils/lazyWithReload';
import { prefetchMainRoutes } from './utils/routePrefetch';

// 첫 진입 화면(게임 목록)만 기본 번들에 포함하고, 나머지 페이지는 이동 시점에 내려받음
const WishlistPage = lazyWithReload(() => import('./pages/WishlistPage'));
const GameDetailPage = lazyWithReload(() => import('./pages/GameDetailPage'));
const InsightsPage = lazyWithReload(() => import('./pages/InsightsPage'));
const PioneerCandidatesPage = lazyWithReload(() => import('./pages/PioneerCandidatesPage'));
const MyPage = lazyWithReload(() => import('./pages/MyPage'));
const PsPlusPricingPage = lazyWithReload(() => import('./pages/PsPlusPricingPage'));
const MonthlyGamesArchivePage = lazyWithReload(() => import('./pages/MonthlyGamesArchivePage'));
const CurationPage = lazyWithReload(() => import('./pages/CurationPage'));
const AdminPage = lazyWithReload(() => import('./pages/AdminPage'));
const ArcadePage = lazyWithReload(() => import('./pages/ArcadePage'));
const PrivacyPage = lazyWithReload(() => import('./pages/PrivacyPage'));
const TermsPage = lazyWithReload(() => import('./pages/TermsPage'));
const GuidePage = lazyWithReload(() => import('./pages/GuidePage'));

// 페이지 청크 로딩 중 화면 높이를 확보해 푸터가 밀리는 레이아웃 이동 방지
const PageFallback = () => (
    <div className="pt-20 min-h-screen">
        <PSLoader />
    </div>
);

// 로그인 필요 페이지: 인증 확인 중(null)에는 로더, 비로그인이면 목록으로 이동
// 공개 페이지는 인증 확인을 기다리지 않고 바로 렌더링 (첫 화면 지연 방지)
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated } = useAuth();
    if (isAuthenticated === null) return <PageFallback />;
    return isAuthenticated ? children : <Navigate to="/games" replace />;
};

function AppRoutes() {
    const location = useLocation();
    const background = location.state && location.state.background;

    // 첫 화면 이후 유휴 시간에 주요 메뉴 화면 코드 미리 받기
    useEffect(() => prefetchMainRoutes(), []);

    return (
        <Suspense fallback={<PageFallback />}>
            <Routes location={background || location}>
                <Route path="/" element={<Navigate to="/games" replace />} />
                <Route path="/login" element={<Navigate to="/games" replace />} />

                <Route element={<Layout />}>
                    <Route path="/games" element={<GameListPage />} />
                    <Route path="/games/:id" element={<GameDetailPage />} />
                    <Route path="/curation" element={<CurationPage />} />
                    <Route path="/discover" element={<PioneerCandidatesPage />} />
                    <Route path="/insights" element={<InsightsPage />} />
                    <Route path="/arcade" element={<ArcadePage />} />
                    <Route path="/ps-plus" element={<PsPlusPricingPage />} />
                    <Route path="/monthly-games" element={<MonthlyGamesArchivePage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="/guide" element={<GuidePage />} />
                    <Route
                        path="/wishlist"
                        element={<ProtectedRoute><WishlistPage /></ProtectedRoute>}
                    />
                    <Route
                        path="/profile"
                        element={<ProtectedRoute><MyPage /></ProtectedRoute>}
                    />
                    <Route
                        path="/admin"
                        element={<ProtectedRoute><AdminPage /></ProtectedRoute>}
                    />
                </Route>
            </Routes>

            {/* background location 패턴: 게임 상세를 모달처럼 오버레이 */}
            {background && (
                <Suspense fallback={null}>
                    <Routes>
                        <Route path="/games/:id" element={<GameDetailPage />} />
                    </Routes>
                </Suspense>
            )}
        </Suspense>
    );
}

const LoginModalWrapper = () => {
    const { isLoginModalOpen, closeLoginModal } = useAuth();
    return <LoginModal isOpen={isLoginModalOpen} onClose={closeLoginModal} />;
};

function App() {
    const [isBooting, setIsBooting] = useState(false);

    useEffect(() => {
        const handleBooting = () => setIsBooting(true);
        window.addEventListener('backend-booting', handleBooting);

        let unsubscribeFCM = null;
        let cancelled = false;

        // Firebase(FCM)는 첫 화면 렌더링에 필요 없으므로 별도 청크로 지연 로드
        import('./utils/fcm')
            .then(({ onForegroundMessage }) => onForegroundMessage())
            .then((unsub) => {
                if (cancelled) unsub?.();
                else unsubscribeFCM = unsub;
            })
            .catch(() => { /* 미지원 브라우저·청크 로드 실패 시 포그라운드 알림만 생략 */ });

        return () => {
            cancelled = true;
            window.removeEventListener('backend-booting', handleBooting);
            if (unsubscribeFCM) {
                unsubscribeFCM();
            }
        };
    }, []);

    const handleResolved = () => {
        setIsBooting(false);
        window.location.href = '/games';
    };

    if (isBooting) {
        return <BootingScreen onResolved={handleResolved} />;
    }

    return (
        <AuthProvider>
            <BrowserRouter>
                <RouteChangeTracker />
                <Toaster
                    position="top-center"
                    toastOptions={{
                        style: { background: '#333', color: '#fff' },
                        success: { iconTheme: { primary: '#0070D1', secondary: '#fff' } },
                    }}
                />
                <AppRoutes />
                <LoginModalWrapper />
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
