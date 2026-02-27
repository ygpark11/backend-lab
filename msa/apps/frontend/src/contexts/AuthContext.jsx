import React, { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';
import { requestFcmToken, onForegroundMessage } from '../utils/fcm';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // 전체 유저 정보
    const [isAuthenticated, setIsAuthenticated] = useState(null); // 로그인 여부 (null: 로딩중)

    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    useEffect(() => {
        const initAuth = async () => {
            try {
                const response = await client.get('/api/v1/members/me');
                setUser(response.data);
                setIsAuthenticated(true);

                requestFcmToken();
                onForegroundMessage();
            } catch (error) {
                setUser(null);
                setIsAuthenticated(false);
            }
        };

        initAuth();
    }, []);

    const login = (userData) => {
        setUser(userData);
        setIsAuthenticated(true);
        setIsLoginModalOpen(false); // 로그인 성공 시 모달 닫기
    };

    const logout = () => {
        setUser(null);
        setIsAuthenticated(false);
    };

    const openLoginModal = () => setIsLoginModalOpen(true);
    const closeLoginModal = () => setIsLoginModalOpen(false);

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated,
            login,
            logout,
            openLoginModal,
            closeLoginModal,
            isLoginModalOpen
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);