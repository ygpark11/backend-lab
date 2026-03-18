import axios from 'axios';
import toast from 'react-hot-toast';

export const BASE_URL = import.meta.env.MODE === 'development'
    ? 'http://localhost:8080'
    : '';

const client = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

/**
 * ===============================
 * 🔐 Refresh Token Race Control
 * ===============================
 */
let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(callback) {
    refreshSubscribers.push(callback);
}

function onRefreshed() {
    refreshSubscribers.forEach((callback) => callback());
    refreshSubscribers = [];
}

client.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config || {};

        if (originalRequest?.url && !originalRequest.url.includes('/actuator/health')) {
            if (!error.response || [502, 503, 504].includes(error.response?.status)) {
                window.dispatchEvent(new Event('backend-booting'));
                return Promise.reject(error);
            }
        }

        if (!error.response) {
            return Promise.reject(error);
        }

        const status = error.response.status;

        // 403 Forbidden
        if (status === 403) {
            toast.error("이 작업을 수행할 권한이 없습니다.", {
                id: 'forbidden-error',
                style: {
                    borderRadius: '10px',
                    background: '#333',
                    color: '#fff',
                },
            });
            return Promise.reject(error);
        }

        // 401 Unauthorized
        if (status === 401 && !originalRequest._retry) {
            // 🚨 reissue 요청 자체가 401이면 무한 루프 방지를 위해 즉시 거절
            if (originalRequest?.url?.includes('/reissue')) {
                return Promise.reject(error);
            }

            originalRequest._retry = true;

            // 이미 다른 요청이 토큰 재발급을 진행 중일 때
            if (isRefreshing) {
                // 새로운 Promise를 만들어 대기열에 넣고 기다림
                return new Promise((resolve) => {
                    subscribeTokenRefresh(() => {
                        // 재발급이 성공하면 원래 요청을 다시 수행
                        resolve(client(originalRequest));
                    });
                });
            }

            // 내가 총대 메고 재발급 시작
            isRefreshing = true;

            try {
                // 토큰 재발급 요청
                await client.post('/api/v1/auth/reissue');

                // 성공 시 대기 중이던 요청들에게 신호 보냄
                onRefreshed();

                // 내 원래 요청 재수행
                return client(originalRequest);

            } catch (reissueError) {
                console.error("토큰 재발급 실패");

                // 재발급 실패 시 대기열 비우기 (메모리 누수 방지)
                refreshSubscribers = [];

                // 비로그인 개방형으로 변경하기 위해 주석
                /*if (window.location.pathname !== '/') {
                    window.location.href = '/';
                }*/

                //그냥 에러만 반환해서 컴포넌트 단에서 잡도록 위임
                return Promise.reject(reissueError);
            } finally {
                // 성공하든 실패하든 플래그 초기화
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default client;