import axios from 'axios';

// 1. 기본 설정 (백엔드 주소)
const client = axios.create({
    baseURL: 'http://localhost:8080',
    headers: {
        'Content-Type': 'application/json',
    },
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