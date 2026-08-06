import api from '../api';
//facturas
export const getFacturas = (params) => {
  return api.get('/facturas', { params });
};
export const getFactura = (id) => api.get(`/facturas/${id}`);
export const createFactura = (data) => {
  return api.post('/facturas', data);
};
export const updateFactura = (id, data) => api.patch(`/facturas/${id}`, data);
export const deleteFactura = (id) => api.delete(`/facturas/${id}`);
//Fin facturas
