import api from "../api";
//useUsuarios
export const getUsuario = (id) => api.get(`/usuarios/${id}`);
export const getUsuarios = async (params = {}) => {
    return await api.get('/usuarios', { params });
};
export const createUsuario = (data) => {
    return api.post('/usuarios', data);
};
export const updateUsuario = (id, data) => api.patch(`/usuarios/${id}`, data);
export const deleteUsuario = (id) => api.delete(`/usuarios/${id}`);
