import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import RouteChangeTracker from "./components/common/RouteChangeTracker";
import { Toaster } from 'react-hot-toast';
import PSLoader from './components/PSLoader';
import Layout from './components/Layout';
// 🚀 LoginPage 임포트 삭제! (이제 모달을 쓰므로 필요 없습니다)
import GameListPage from './pages/GameListPage';
import WishlistPage from './pages/WishlistPage';
import GameDetailPage from './pages/GameDetailPage';

import { AuthProvider, useAuth } from './contexts/AuthContext';

function AppRoutes() {
    const { isAuthenticated } = useAuth();

    // 로딩 중 처리
    if (isAuthenticated === null) {
        return (
            <div className="min-h-screen bg-ps-black text-white flex items-center justify-center">
                <PSLoader />
            </div>
        );
    }

    return (
        <Routes>
            {/* 1. 루트 접속 시 무조건 /games (목록)으로 보냄 */}
            <Route
                path="/"
                element={<Navigate to="/games" replace />}
            />

            {/* 2. 로그인 페이지 접근 차단: 더 이상 페이지가 없으므로 /games로 돌려보냄 */}
            <Route
                path="/login"
                element={<Navigate to="/games" replace />}
            />

            {/* 3. Layout이 감싸고 있는 메인 서비스 영역 (네비게이션 바 등) */}
            <Route element={<Layout />}>
                {/* 🔓 누구나 접근 가능한 개방 구역 (비로그인 허용) */}
                <Route path="/games" element={<GameListPage />} />
                <Route path="/games/:id" element={<GameDetailPage />} />

                {/* 🔒 인증된 유저만 접근 가능한 구역 */}
                {/* 🚀 비로그인 유저가 주소창에 /wishlist를 치고 들어오면 안전한 /games 로 튕겨냅니다 */}
                <Route
                    path="/wishlist"
                    element={isAuthenticated ? <WishlistPage /> : <Navigate to="/games" replace />}
                />
            </Route>
        </Routes>
    );
}

function App() {
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
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;