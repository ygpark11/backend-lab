import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import RouteChangeTracker from "./components/common/RouteChangeTracker";
import { Toaster } from 'react-hot-toast';
import PSLoader from './components/PSLoader';
import Layout from './components/Layout';
import GameListPage from './pages/GameListPage';
import WishlistPage from './pages/WishlistPage';
import GameDetailPage from './pages/GameDetailPage';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginModal from './components/LoginModal';

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
            <Route path="/" element={<Navigate to="/games" replace />} />
            <Route path="/login" element={<Navigate to="/games" replace />} />

            <Route element={<Layout />}>
                <Route path="/games" element={<GameListPage />} />
                <Route path="/games/:id" element={<GameDetailPage />} />
                <Route
                    path="/wishlist"
                    element={isAuthenticated ? <WishlistPage /> : <Navigate to="/games" replace />}
                />
            </Route>
        </Routes>
    );
}

const LoginModalWrapper = () => {
    const { isLoginModalOpen, closeLoginModal } = useAuth();

    return (
        <LoginModal
            isOpen={isLoginModalOpen}
            onClose={closeLoginModal}
        />
    );
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