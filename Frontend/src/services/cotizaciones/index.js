import api from '../api';

export const listarCotizaciones = (params) => api.get('/cotizaciones', { params });
export const obtenerCotizacion = (id) => api.get(`/cotizaciones/${id}`);
export const crearCotizacion = (payload) => api.post('/cotizaciones', payload);
export const editarCotizacion = (id, payload) => api.patch(`/cotizaciones/${id}`, payload);
export const cancelarCotizacion = (id) => api.post(`/cotizaciones/${id}/cancelar`);
export const reactivarCotizacion = (id) => api.post(`/cotizaciones/${id}/reactivar`);
export const generarFacturaCotizacion = (id) => api.post(`/cotizaciones/${id}/generar-factura`);
export const buscarProductosCotizacion = (search, signal) => api.get('/cotizaciones/catalogos/productos', { params: { search }, signal });
export const buscarClientesCotizacion = (search, signal) => api.get('/cotizaciones/catalogos/clientes', { params: { search }, signal });
export const buscarVendedoresCotizacion = (search, signal) => api.get('/cotizaciones/catalogos/vendedores', { params: { search }, signal });
