import { ref } from 'vue';
import {
  getProducto,
  getProductos,
  createProducto,
  updateProducto,
  deleteProducto
} from '../../services/productos';
  const productos = ref([]);

  const filtros = ref({
    nombre: '',
    desde: '',
    hasta: '',
    tipo: ''
  });

  const pagination = ref({
    page: 1,
    limit: 8,
    total: 0,
    lastPage: 0
  });
export function useProductos() {
  const cargarProductos = async (extraParams = {}) => {
    const rawParams = {
      ...filtros.value,
      page: pagination.value.page,
      limit: pagination.value.limit,
      ...extraParams
    };
    const params = Object.fromEntries(
      Object.entries(rawParams).filter(([, value]) => value !== '' && value !== null && value !== undefined)
    );

    const { data } = await getProductos(params);

    productos.value = Array.isArray(data.data)
      ? data.data
      : Array.isArray(data)
        ? data
        : [];

    pagination.value.total = data.total || 0;
    pagination.value.lastPage = data.lastPage || 1;
  };
  const obtenerProducto = async (id) => {
    return await getProducto(id);
  };
  const filtrar = async () => {
    pagination.value.page = 1;
    await cargarProductos();
  };

  const cambiarPagina = async (page) => {
    pagination.value.page = page;
    await cargarProductos();
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
    filtros,
    pagination,
    obtenerProducto,
    cargarProductos,
    filtrar,
    cambiarPagina,
    crear,
    actualizar,
    eliminar
  };
}
