import client from './client';

export const adminApi = {
    deleteGame: async (gameId) => {
        return await client.delete(`/api/v1/admin/games/${gameId}`);
    }
};