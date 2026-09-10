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
     * 객체 형태({ score, clearTimeSec, user }) 또는 직접 파라미터(score, clearTimeSec, user) 모두 지원
     */
    async submitScore(gameType, optionsOrScore, maybeClearTimeSec = 0, maybeUser = null) {
        let score, clearTimeSec, user;

        if (typeof optionsOrScore === 'object' && optionsOrScore !== null) {
            score = optionsOrScore.score;
            clearTimeSec = optionsOrScore.clearTimeSec;
            user = optionsOrScore.user;
        } else {
            score = optionsOrScore;
            clearTimeSec = maybeClearTimeSec;
            user = maybeUser;
        }

        const payload = {
            score: Math.floor(Number(score) || 0),
            clearTimeSec: Math.floor(Number(clearTimeSec) || 0)
        };

        try {
            const response = await client.post(`/api/v1/arcade/${gameType}/score`, payload);
            return response.data || { success: true };
        } catch (error) {
            console.error(`[arcadeApi] ${gameType} 점수 등록 실패:`, error?.message);
            return { success: false, error: error?.response?.data || error?.message };
        }
    }
};
