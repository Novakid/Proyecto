import { ref } from "vue";
import { getApiAssetUrl } from "../../../services/api";
import { useTipos } from "../../../services/tipos/useTipos";

export function useTipoForm() {
    const { tipos, getTipos, obtenerTipo, cargarTipos, crear, eliminar, tiposFiltrados, pagination, filtros, cargarDatos, actualizar } = useTipos();
    const handleFiles = (event) => {
        const files = event.target.files;
        imagenes.value = Array.from(files);
        previews.value = imagenes.value.map(file => URL.createObjectURL(file));
    };
    const imagenes = ref([]);
    const previews = ref([]);
    const form = ref({
        nombre: '',
        activo: false,
        descripcion: '',
    });
    const guardarTipo = async () => {
        try {
            const formData = new FormData();
            formData.append('nombre', form.value.nombre);
            formData.append('activo', form.value.activo);
            formData.append('descripcion', form.value.descripcion);
            imagenes.value.forEach((file) => {
            formData.append('imagenes', file);
            });
            await crear(formData);
            form.value = {
            nombre: '',
            activo: false,
            descripcion: '',
            };
            imagenes.value = [];
            previews.value = [];
            await cargarDatos();
        } catch (error) {
            console.error(error);
        }
    };
    const borrarTipo = async (id) => {
        try {
            await eliminar(id);
            await cargarDatos();
        } catch (error) {
            return error;
        }
    }
    const resetFiltros = async () => {
        filtros.value.nombre = '';
        filtros.value.tipoId = '';
        pagination.value.page = 1;
        await cargarDatos();
    };
    const filtrarDatos = async () => {
        try {
            pagination.value.page = 1;
            const resp = await getTipos({
                nombre: filtros.value.nombre,
                tipoId: filtros.value.tipoId,
                page: pagination.value.page,
                limit: pagination.value.limit
            });
            tiposFiltrados.value = Array.isArray(resp.data.data) ? resp.data.data : [];
            pagination.value.total = resp.data.total ?? 0;
            pagination.value.lastPage = resp.data.lastPage ?? 1;
        } catch (error) {
            console.error(error);
        }
    };
    const editarTipo = async (id) => {
        const resp = await obtenerTipo(id);
        const tipo = resp.data;
        form.value = {
            idEditar: tipo.id,
            nombreEditar: tipo.nombre,
            activoEditar: tipo.activo,
            descripcionEditar: tipo.descripcion
        };
        previews.value = tipo.imagenes?.map(img => getApiAssetUrl(img.url)) || [];
        imagenes.value = [];
        await cargarDatos();
    };
    const capturarTipo = async () => {
        try {
            const formData = new FormData();
            formData.append('nombre', form.value.nombreEditar);
            formData.append('activo', form.value.activoEditar);
            formData.append('descripcion', form.value.descripcionEditar);
            imagenes.value.forEach((file) => {
                formData.append('imagenes', file);
            });
            await actualizar(form.value.idEditar, formData);
            await cargarDatos();
        } catch (error) {
            console.error(error);
        }
    }
    return {
        form,
        handleFiles,
        guardarTipo,
        borrarTipo,
        filtrarDatos,
        editarTipo,
        capturarTipo
    }
}
