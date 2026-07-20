import client from './client';

export const getMyPresets = () =>
    client.get('/api/v1/members/me/presets').then(r => r.data);

export const createPreset = (name, filters) =>
    client.post('/api/v1/members/me/presets', { name, filters }).then(r => r.data);

export const updatePreset = (presetId, payload) =>
    client.patch(`/api/v1/members/me/presets/${presetId}`, payload).then(r => r.data);

export const deletePreset = (presetId) =>
    client.delete(`/api/v1/members/me/presets/${presetId}`);
