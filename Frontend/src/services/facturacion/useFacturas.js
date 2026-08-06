import { reactive, ref } from 'vue';
import { getFacturas, getFactura, createFactura, updateFactura, cancelFactura } from './index';

const facturas = ref([]);
const pagination = reactive({ page: 1, limit: 8, total: 0, lastPage: 1 });
const filtros = reactive({ folio: '', desde: '', hasta: '', monto: '', cliente: '', estatus: '' });
const loading = ref(false);
const errorFacturas = ref('');

export function useFacturas() {
  const cargarFacturas = async (page = pagination.page) => {
    loading.value = true;
    errorFacturas.value = '';
    try {
      const params = { page, limit: pagination.limit };
      Object.entries(filtros).forEach(([key, value]) => { if (value !== '' && value != null) params[key] = value; });
      const { data } = await getFacturas(params);
      facturas.value = Array.isArray(data.data) ? data.data : (data.notas_de_pago || []);
      pagination.page = Number(data.page || page);
      pagination.total = Number(data.total ?? facturas.value.length);
      pagination.lastPage = Number(data.lastPage || 1);
    } catch (error) {
      facturas.value = [];
      errorFacturas.value = error.response?.data?.message || 'No fue posible cargar las facturas';
      console.error('Error al cargar facturas', error);
    } finally { loading.value = false; }
  };
  const aplicarFiltros = () => cargarFacturas(1);
  const limpiarFiltros = () => {
    Object.assign(filtros, { folio: '', desde: '', hasta: '', monto: '', cliente: '', estatus: '' });
    return cargarFacturas(1);
  };
  const obtener = async (id) => (await getFactura(id)).data;
  const guardar = async (payload, id = null) => id ? updateFactura(id, payload) : createFactura(payload);
  const cancelar = async (id) => cancelFactura(id);
  return { facturas, pagination, filtros, loading, errorFacturas, cargarFacturas, aplicarFiltros,
    limpiarFiltros, obtener, guardar, cancelar };
}
