import client from './client';

export const bulkDeleteGames = (gameIds) =>
    client.delete('/api/v1/admin/games/bulk', { data: gameIds });

export const registerGame = (psStoreId) =>
    client.post('/api/v1/admin/games/register', { psStoreId });

export const getAdminGameDetail = (gameId) =>
    client.get(`/api/v1/admin/games/${gameId}`);

export const updateGame = (gameId, data) =>
    client.patch(`/api/v1/admin/games/${gameId}`, data);

export const getScrapingRequests = (page = 0, size = 20) =>
    client.get('/api/v1/admin/scraping/requests', { params: { page, size } });

export const retryScrapingRequest = (requestId) =>
    client.post(`/api/v1/admin/scraping/requests/${requestId}/retry`);

export const refreshSingleGame = (gameId) =>
    client.post(`/api/v1/admin/games/${gameId}/refresh`);
