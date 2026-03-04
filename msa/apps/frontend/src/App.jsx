import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import RouteChangeTracker from "./components/common/RouteChangeTracker";
import { Toaster } from 'react-hot-toast';
import PSLoader from './components/PSLoader';
import Layout from './components/Layout';
import GameListPage from './pages/GameListPage';
import WishlistPage from './pages/WishlistPage';
import GameDetailPage from './pages/GameDetailPage';
import InsightsPage from "./pages/InsightsPage.jsx";

import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginModal from './components/LoginModal';

function AppRoutes() {
    const { isAuthenticated } = useAuth();

    // 🚀 1. 현재 주소(location) 추적
    const location = useLocation();

    // 🚀 2. 마법의 핵심: 이전 화면(배경)을 기억하는 state가 있는지 확인
    const background = location.state && location.state.background;

    // 로딩 중 처리
    if (isAuthenticated === null) {
        return (
            <div className="min-h-screen bg-ps-black text-white flex items-center justify-center">
                <PSLoader />
            </div>
        );
    }

    return (
        <>
            {/* 🚀 3. 메인 라우터: 모달이 뜰 때는 'background(목록)'를 렌더링하고, 평소엔 현재 주소를 렌더링합니다. */}
            <Routes location={background || location}>
                <Route path="/" element={<Navigate to="/games" replace />} />
                <Route path="/login" element={<Navigate to="/games" replace />} />

                <Route element={<Layout />}>
                    <Route path="/games" element={<GameListPage />} />
                    <Route path="/insights" element={<InsightsPage />} />
                    <Route path="/games/:id" element={<GameDetailPage />} />
                    <Route
                        path="/wishlist"
                        element={isAuthenticated ? <WishlistPage /> : <Navigate to="/games" replace />}
                    />
                </Route>
            </Routes>

            {/* 5. 모달 라우터: 가짜 모달 대신 방금 만든 진짜 GameDetailPage를 넣습니다! */}
            {background && (
                <Routes>
                    <Route path="/games/:id" element={<GameDetailPage />} />
                </Routes>
            )}
        </>
    );
}

const LoginModalWrapper = () => {
    const { isLoginModalOpen, closeLoginModal } = useAuth();
    return <LoginModal isOpen={isLoginModalOpen} onClose={closeLoginModal} />;
};

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
                <LoginModalWrapper />
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;