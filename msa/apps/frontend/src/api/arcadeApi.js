import client from './client';



export const arcadeApi = {
    /**
     * 리더보드 목록 및 내 순위 조회 (비로그인/로그인 공용)
     */
    async getLeaderboard(gameType, _user = null) {
        try {
            const response = await client.get(`/api/v1/arcade/${gameType}/leaderboard`);
            const rawData = response.data;

            // 응답 데이터 구조 정규화
            if (Array.isArray(rawData)) {
                return {
                    gameType,
                    topList: rawData,
                    myRank: null
                };
            }

            if (rawData && typeof rawData === 'object') {
                return {
                    gameType: rawData.gameType || gameType,
                    topList: Array.isArray(rawData.topList) ? rawData.topList : (Array.isArray(rawData.data) ? rawData.data : []),
                    myRank: rawData.myRank || null
                };
            }

            return { gameType, topList: [], myRank: null };
        } catch (error) {
            console.warn('[arcadeApi] 리더보드 조회 실패:', error?.message);
            return {
                gameType,
                topList: [],
                myRank: null
            };
        }
    },

    /**
     * 점수 등록 (로그인 회원 전용)
     */
    async submitScore(gameType, { score, clearTimeSec, user }) {
        // 비로그인 사용자는 서버 요청 및 저장을 전면 차단
        if (!user) {
            return { success: false, isGuest: true };
        }

        const payload = {
            score,
            clearTimeSec
        };

        try {
            const response = await client.post(`/api/v1/arcade/${gameType}/score`, payload);
            return response.data || { success: true };
        } catch (error) {
            console.error('[arcadeApi] 점수 등록 실패:', error?.message);
            return { success: false, error: error?.response?.data || error?.message };
        }
    }
};
