import api from '../api';

const base = (usuarioId) => `/usuarios/${usuarioId}/precios-especiales`;

export const getPreciosEspeciales = (usuarioId, params = {}) => api.get(base(usuarioId), { params });
export const getProductosDisponibles = (usuarioId, params = {}) => api.get(`${base(usuarioId)}/productos-disponibles`, { params });
export const createPrecioEspecial = (usuarioId, data) => api.post(base(usuarioId), data);
export const updatePrecioEspecial = (usuarioId, precioId, data) => api.patch(`${base(usuarioId)}/${precioId}`, data);
