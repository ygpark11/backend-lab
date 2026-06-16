import client from './client';

export const adminApi = {
    deleteGame: async (gameId) => {
        return await client.delete(`/api/v1/admin/games/${gameId}`);
    },

    refreshGame: async (gameId) => {
        return await client.post(`/api/v1/admin/games/${gameId}/refresh`);
    },

    clearAllCaches: async () => {
        return await client.post('/api/v1/admin/cache/refresh');
    },

    deleteCandidate: async (psStoreId) => {
        return await client.delete(`/api/v1/admin/scraping/candidates/${psStoreId}`);
    }
};