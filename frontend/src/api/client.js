import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const getTins = (params) => api.get('/tins', { params });
export const getTin = (id) => api.get(`/tins/${id}`);
export const createTin = (data) => api.post('/tins', data);
export const updateTin = (id, data) => api.put(`/tins/${id}`, data);
export const deleteTin = (id) => api.delete(`/tins/${id}`);
export const getStats = () => api.get('/stats');
export const getSettings = () => api.get('/settings');
export const updateSettings = (data) => api.put('/settings', data);
export const resetApp = () => api.post('/reset');
export const importCSV = (formData) => api.post('/import', formData);
export const getBrandSuggestions = (q) => api.get('/brands', { params: { q } });
export const getBlendSuggestions = (q) => api.get('/blends', { params: { q } });
