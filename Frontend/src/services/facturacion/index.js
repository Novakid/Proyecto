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
export const cancelFactura = (id) => api.post(`/facturas/${id}/cancelar`);
export const buscarVendedoresFactura = (search) => api.get('/facturas/catalogos/vendedores', { params: { search } });
export const buscarClientesFactura = (search) => api.get('/facturas/catalogos/clientes', { params: { search } });
export const buscarProductosFactura = (search, signal) => api.get('/facturas/catalogos/productos', { params: { search, limit: 10 }, signal });
export const obtenerPrecioFactura = (clienteId, productoId) => api.get('/facturas/catalogos/precio', { params: { clienteId, productoId } });
export const timbrarFactura = (id) => api.patch(`/facturas/${id}/timbrar`);
//Fin facturas
