import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LoginPage from './pages/LoginPage';
import GameListPage from './pages/GameListPage';
import WishlistPage from './pages/WishlistPage';
import GameDetailPage from './pages/GameDetailPage';

// 로그인했는지 검사하는 문지기 컴포넌트
const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem('accessToken');
    // 토큰이 없으면 로그인 페이지로 쫓아냄
    return token ? children : <Navigate to="/" />;
};

function App() {
    return (
        <BrowserRouter>
            <Toaster
                position="top-center"
                toastOptions={{
                    style: {
                        background: '#333',
                        color: '#fff',
                    },
                    success: {
                        iconTheme: {
                            primary: '#0070D1', // PS Blue
                            secondary: '#fff',
                        },
                    },
                }}
            />

            <Routes>
                {/* 로그인 페이지 */}
                <Route path="/" element={<LoginPage />} />

                {/* 게임 목록 페이지 (보안 적용: 로그인한 사람만 접근 가능) */}
                <Route
                    path="/games"
                    element={
                        <PrivateRoute>
                            <GameListPage />
                        </PrivateRoute>
                    }
                />

                {/* 게임 상세 페이지 */}
                <Route
                    path="/games/:id"
                    element={
                        <PrivateRoute>
                            <GameDetailPage />
                        </PrivateRoute>
                    }
                />

                {/* 내 찜 목록 */}
                <Route
                    path="/wishlist"
                    element={
                        <PrivateRoute>
                            <WishlistPage />
                        </PrivateRoute>
                    }
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;