import api from '../api';
//useProductos
export const getProductos = () => api.get('/productos');
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
//Fin useProductos