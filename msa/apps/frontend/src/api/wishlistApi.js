import client from './client';

export const getMyWishlist = (params) =>
    client.get('/api/v1/wishlists', { params }).then(r => r.data);

export const upsertWishlist = (gameId, targetPrice = null) =>
    client.put(`/api/v1/wishlists/${gameId}`, { targetPrice }).then(r => r.data);

export const removeWishlist = (gameId) =>
    client.delete(`/api/v1/wishlists/${gameId}`).then(r => r.data);
