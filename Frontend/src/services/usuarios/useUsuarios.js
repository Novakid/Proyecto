import { ref } from "vue";
import {
    getUsuario,
    getUsuarios,
    createUsuario,
    updateUsuario,
    deleteUsuario,
} from '../../services/usuarios';
const usuariosFiltrados = ref([]);
const pagination = ref({
    page: 1,
    limit: 8,
    total: 0,
    lastPage: 0
});
const filtros = ref({
    nombre: '',
    estatus: '',
});
export function useUsuarios() {
    const obtenerUsuarios = async (extraParams = {}) => {
        const params = {
            ...filtros.value,
            page: pagination.value.page,
            limit: pagination.value.limit,
            ...extraParams
        };
        const { data } = await getUsuarios(params);

        usuariosFiltrados.value = data.data || data;
        pagination.value.total = data.total || 0;
        pagination.value.lastPage = data.lastPage || 1;
    };
    const filtrar = async () => {
        pagination.value.page = 1;
        await obtenerUsuarios();
    };
    const crear = async (payload) => {
        await createUsuario(payload);
        await obtenerUsuarios();
    };
    const cambiarPagina = async (page) => {
        pagination.value.page = page;
        await obtenerUsuarios();
    };
    const obtenerUsuario = async (id) => {
        return await getUsuario(id);
    };
    const actualizar = async (id, payload) => {
        await updateUsuario(id, payload);
        await obtenerUsuarios();
    };
    const eliminar = async (id) => {
        await deleteUsuario(id);
        await obtenerUsuarios();
    };
    return {
        usuariosFiltrados,
        pagination,
        filtros,
        eliminar,
        actualizar,
        obtenerUsuario,
        filtrar,
        cambiarPagina,
        obtenerUsuarios,
        crear
    };
}
