import { ref } from 'vue';
import {
  getTipos,
  getTipo,
  createTipo,
  updateTipo,
  deleteTipo,
  cargarDatosService
} from '../../services/tipos';

export function useTipos() {
  const tiposFiltrados = ref([]);
  const pagination = ref({
    page: 1,
    limit: 8,
    total: 0,
    lastPage: 0
  });
  const filtros = ref({
    nombre: '',
    tipoId: ''
  });
  const cargarDatos = async () => {
    const resp = await cargarDatosService({
      page: pagination.value.page,
      limit: pagination.value.limit,
      nombre: filtros.value.nombre,
      tipoId: filtros.value.tipoId
    });
    tiposFiltrados.value = resp.data.data;
    pagination.value.total = resp.data.total;
    pagination.value.lastPage = resp.data.lastPage;
  };
  const tipos = ref([]);
  const cargarTipos = async () => {
    const { data } = await getTipos();
    tipos.value = data;
  };
  const crear = async (payload) => {
    await createTipo(payload);
    await cargarTipos();
  };
  const obtenerTipo = async (id) => {
    return await getTipo(id);
  };
  const actualizar = async (id, payload) => {
    await updateTipo(id, payload);
    await cargarTipos();
  };
  const eliminar = async (id) => {
    await deleteTipo(id);
    await cargarTipos();
  };
  return {
    tipos,
    cargarDatos,
    getTipos,
    cargarTipos,
    crear,
    actualizar,
    eliminar,
    obtenerTipo,
    tiposFiltrados,
    pagination,
    filtros,
  };
}