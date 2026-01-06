import { useEffect, useState } from 'react'; // useState 추가
import { requestFcmToken, onForegroundMessage } from './utils/fcm';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import client from './api/client'; // client import 필요
import PSLoader from './components/PSLoader'; // 로딩바 추가

import LoginPage from './pages/LoginPage';
import GameListPage from './pages/GameListPage';
import WishlistPage from './pages/WishlistPage';
import GameDetailPage from './pages/GameDetailPage';

function App() {
    // 1. 인증 상태 관리 (null: 확인 중, true: 로그인됨, false: 안됨)
    const [isAuthenticated, setIsAuthenticated] = useState(null);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                await client.get('/api/v1/members/me');
                setIsAuthenticated(true);

                // 로그인 성공 시 FCM 설정
                requestFcmToken();
                onForegroundMessage();
            } catch (error) {
                // 401 에러 등이 나면 로그인 안 된 것
                setIsAuthenticated(false);
            }
        };

        checkAuth();
    }, []);

    // 2. 인증 체크 중이면 로딩 화면 보여주기
    if (isAuthenticated === null) {
        return (
            <div className="min-h-screen bg-ps-black text-white flex items-center justify-center">
                <PSLoader />
            </div>
        );
    }

    return (
        <BrowserRouter>
            <Toaster
                position="top-center"
                toastOptions={{
                    style: { background: '#333', color: '#fff' },
                    success: { iconTheme: { primary: '#0070D1', secondary: '#fff' } },
                }}
            />

            <Routes>
                {/* 로그인 페이지: 이미 로그인된 상태면 /games로 튕겨내기
                   (replace: 뒤로가기 방지)
                */}
                <Route
                    path="/"
                    element={isAuthenticated ? <Navigate to="/games" replace /> : <LoginPage setIsAuthenticated={setIsAuthenticated} />}
                />

                {/* 나머지 페이지: 로그인 안 됐으면 / 로 튕겨내기 */}
                <Route
                    path="/games"
                    element={isAuthenticated ? <GameListPage /> : <Navigate to="/" replace />}
                />

                <Route
                    path="/games/:id"
                    element={isAuthenticated ? <GameDetailPage /> : <Navigate to="/" replace />}
                />

                <Route
                    path="/wishlist"
                    element={isAuthenticated ? <WishlistPage /> : <Navigate to="/" replace />}
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;