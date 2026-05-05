import { ref } from 'vue';
import {
  getProductos,
  createProducto,
  updateProducto,
  deleteProducto
} from '../../services/productos';

export function useProductos() {
  const productos = ref([]);
  const cargarProductos = async () => {
    const { data } = await getProductos();
    productos.value = data;
  };
  const crear = async (payload) => {
    await createProducto(payload);
    await cargarProductos();
  };
  const actualizar = async (id, payload) => {
    await updateProducto(id, payload);
    await cargarProductos();
  };
  const eliminar = async (id) => {
    await deleteProducto(id);
    await cargarProductos();
  };
  return {
    productos,
    cargarProductos,
    crear,
    actualizar,
    eliminar
  };
}