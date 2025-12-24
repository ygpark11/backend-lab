import axios from 'axios';

// 1. 환경 변수로 주소 분기 처리
// 개발 모드(npm run dev)일 땐: http://localhost:8080
// 운영 모드(Docker 배포)일 땐: '' (빈 값 -> 현재 도메인 ps-signal.com을 따라감)
const BASE_URL = import.meta.env.MODE === 'development'
    ? 'http://localhost:8080'
    : '';

const client = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // CORS 관련 쿠키/인증 정보를 주고받을 때 필수
});

// 2. 요청 가로채기 (Interceptor)
// API 요청을 보낼 때마다 주머니(LocalStorage)를 뒤져서 토큰이 있으면 헤더에 붙임
client.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default client;