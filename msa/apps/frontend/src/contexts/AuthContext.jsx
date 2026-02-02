import React, { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';
import { requestFcmToken, onForegroundMessage } from '../utils/fcm';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // 전체 유저 정보
    const [isAuthenticated, setIsAuthenticated] = useState(null); // 로그인 여부 (null: 로딩중)

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

    // 로그인 성공 시 상태 업데이트 함수 (LoginPage에서 사용)
    const login = (userData) => {
        setUser(userData);
        setIsAuthenticated(true);
    };

    // 로그아웃 시 상태 초기화
    const logout = () => {
        setUser(null);
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};