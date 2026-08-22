import { reactive, ref } from 'vue';
import { listarCotizaciones } from './index';

const cotizaciones = ref([]);
const loading = ref(false);
const error = ref('');
const pagination = reactive({ page: 1, limit: 8, total: 0, lastPage: 1 });
const filtros = reactive({ folio: '', cliente: '', desde: '', hasta: '', monto: '', solicitada: '' });

export function useCotizaciones() {
  async function cargar(page = pagination.page) {
    loading.value = true; error.value = '';
    try {
      const params = { page, limit: pagination.limit };
      Object.entries(filtros).forEach(([key, value]) => { if (value !== '') params[key] = value; });
      const { data } = await listarCotizaciones(params);
      cotizaciones.value = Array.isArray(data.data) ? data.data : [];
      Object.assign(pagination, { page: Number(data.page || 1), total: Number(data.total || 0), lastPage: Number(data.lastPage || 1) });
    } catch (requestError) {
      cotizaciones.value = [];
      error.value = requestError.response?.data?.message || 'No fue posible cargar las cotizaciones';
    } finally {
      loading.value = false;
    }
  }
  const limpiar = () => { Object.assign(filtros, { folio: '', cliente: '', desde: '', hasta: '', monto: '', solicitada: '' }); return cargar(1); };
  return { cotizaciones, loading, error, pagination, filtros, cargar, limpiar };
}
