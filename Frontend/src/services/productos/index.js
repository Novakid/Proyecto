import api from '../api';
//useProductos
export const getProductos = (params) => {
  return api.get('/productos', { params });
};
export const getProducto = (id) => api.get(`/productos/${id}`);
export const createProducto = (data) => {
  return api.post('/productos', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};
export const updateProducto = (id, data) => api.patch(`/productos/${id}`, data);
export const deleteProducto = (id) => api.delete(`/productos/${id}`);
export const agregarStockProducto = (id, cantidad) => api.post(`/productos/${id}/agregar-stock`, { cantidad });
export const reactivateProducto = (id) => api.post(`/productos/${id}/reactivar`);
//Fin useProductos
