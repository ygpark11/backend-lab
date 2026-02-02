import { useAuth } from '../contexts/AuthContext';

export const useCurrentUser = () => {
    // API 호출(axios) 대신 Context에서 꺼내옴 (메모리 조회)
    const { user, isAuthenticated } = useAuth();

    // 로딩 중(null)이 아니면서 user가 있고, role이 ADMIN인지 확인
    const isAdmin = isAuthenticated && user?.role === 'ROLE_ADMIN';

    // isAuthenticated가 null이면 아직 로딩 중인 것
    return { user, isAdmin, loading: isAuthenticated === null };
};