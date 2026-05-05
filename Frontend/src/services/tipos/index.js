import api from '../api';
//useTipos
export const getTipo = (id) => api.get(`/tipos/${id}`);
export const getTipos = async (params = {}) => {
  return await api.get('/tipos', { params });
};
export const cargarDatosService = (params) => {
  return api.get('/tipos', { params });
};
export const createTipo = (data) => {
  return api.post('/tipos', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};
export const updateTipo = (id, data) => api.patch(`/tipos/${id}`, data);
export const deleteTipo = (id) => api.delete(`/tipos/${id}`);
//Fin useTipos