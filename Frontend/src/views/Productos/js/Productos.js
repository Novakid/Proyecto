import { ref } from 'vue';
import { getApiAssetUrl } from '../../../services/api';
import { useProductos } from '../../../services/productos/useProductos';
import Swal from 'sweetalert2';
import { Modal } from 'bootstrap';
const tiposSeleccionados = ref([]);
const imagenes = ref([]);
const previews = ref([]);
const form = ref({
    codigo: '',
    precio: null,
    stock: null,
    nuevo: false,
    almacen: 0,
    piso: 0,
    descripcion: '',
    tipos: [],
    fecha_ingreso: new Date(),
});
const formCrear = ref({
    codigo: '',
    precio: null,
    stock: null,
    existencia: null,
    nuevo: false,
    activo: false,
    almacen: 0,
    piso: 0,
    descripcion: '',
    tipos: [],
    fecha_ingreso: new Date(),
});
const formEditar = ref({
    id: null,
    codigo: '',
    precio: null,
    stock: null,
    existencia: null,
    nuevo: false,
    activo: false,
    almacen: 0,
    piso: 0,
    descripcion: '',
    tipos: [],
});
export function useProductoForm(tipos) { 
    const { crear, eliminar, obtenerProducto, actualizar, cargarProductos } = useProductos();
    const handleFiles = (event) => {
        const files = event.target.files;
        imagenes.value = Array.from(files);
        previews.value = imagenes.value.map(file => URL.createObjectURL(file));
    };
    const detalleProducto = async (id) => {
        const resp = await obtenerProducto(id);
        const producto = resp.data;
        form.value = {
            idDetalle: producto.id,
            codigoDetalle: producto.codigo,
            precioDetalle: producto.precio,
            stockDetalle: producto.stock,
            nuevoDetalle: producto.nuevo,
            almacenDetalle: producto.almacen ?? 0,
            activoDetalle: producto.activo,
            existenciaDetalle: producto.existencia,
            pisoDetalle: producto.piso ?? 0,
            descripcionDetalle: producto.descripcion,
            tipos: producto.tipos.map(t => t.id),
        };
        previews.value = producto.imagenes?.map(img => getApiAssetUrl(img.url)) || [];
        imagenes.value = [];        
    }
    const editarProducto = async (id) => {
        const resp = await obtenerProducto(id);
        const producto = resp.data;
        formEditar.value = {
            id: producto.id,
            codigo: producto.codigo,
            precio: producto.precio,
            stock: producto.stock,
            nuevo: producto.nuevo,
            almacen: producto.almacen ?? 0,
            activo: producto.activo,
            existencia: producto.existencia,
            piso: producto.piso ?? 0,
            descripcion: producto.descripcion,
            tipos: producto.tipos.map(t => t.id),
        };
        previews.value = producto.imagenes?.map(img => getApiAssetUrl(img.url)) || [];
        imagenes.value = [];
    }
    const editarProductoSubmit = async () => {
        try {
            const formData = new FormData();
            formData.append('codigo', formEditar.value.codigo);
            formData.append('precio', formEditar.value.precio);
            formData.append('stock', formEditar.value.stock);
            formData.append('existencia', formEditar.value.existencia);
            formData.append('nuevo', formEditar.value.nuevo);
            formData.append('activo', formEditar.value.activo);
            formData.append('descripcion', formEditar.value.descripcion);
            formData.append('almacen', formEditar.value.almacen);
            formData.append('piso', formEditar.value.piso);
            tiposSeleccionados.value.forEach(id => {
                formData.append('tipos', String(id));
            });
            imagenes.value.forEach(file => {
                formData.append('imagenes', file);
            });
            await actualizar(formEditar.value.id, formData);
            await Swal.fire('Producto actualizado correctamente', imagenes.value.length ? 'Imagen guardada correctamente' : '', 'success');
            Modal.getInstance(document.getElementById('editar'))?.hide();
        } catch (error) {
            await Swal.fire('No fue posible actualizar el producto', Array.isArray(error.response?.data?.message) ? error.response.data.message.join('\n') : error.response?.data?.message || 'Error de conexión', 'error');
        }
    };
    const guardarProducto = async () => {
        try {
            const formData = new FormData();
            formData.append('precio', formCrear.value.precio);
            formData.append('stock', formCrear.value.stock);
            formData.append('descripcion', formCrear.value.descripcion);
            formData.append('existencia', formCrear.value.existencia);
            formData.append('nuevo', formCrear.value.nuevo);
            formData.append('activo', formCrear.value.activo);
            formData.append('codigo', formCrear.value.codigo);
            formData.append('piso', formCrear.value.piso);
            formData.append('almacen', formCrear.value.almacen);
            formData.append('fecha_ingreso', formCrear.value.fecha_ingreso);
            imagenes.value.forEach(file => {
                formData.append('imagenes', file);
            });
            tiposSeleccionados.value.forEach(id => {
                formData.append('tipos', String(id));
            });
            await crear(formData);
            await Swal.fire('Producto creado correctamente', imagenes.value.length ? 'Imagen guardada correctamente' : '', 'success');
            Modal.getInstance(document.getElementById('creacion'))?.hide();
            formCrear.value = {
                codigo: '',
                activo: false,
                descripcion: '',
                stock: '',
                precio: '',
                existencia: '',
                nuevo: false,
                almacen: 0,
                piso: 0,
                tipos: [],
                fecha_ingreso: new Date(),
            };
            imagenes.value = [];
            previews.value = [];
        } catch (error) {
            await Swal.fire('No fue posible crear el producto', Array.isArray(error.response?.data?.message) ? error.response.data.message.join('\n') : error.response?.data?.message || 'Error de conexión', 'error');
        }
    };
    const agregarTipo = (event) => {
        const id = Number(event.target.value);
        if (!id) return;

        if (!tiposSeleccionados.value.includes(id)) {
            tiposSeleccionados.value.push(id);
        }

        event.target.value = '';
    };
    const quitarTipo = (id) => {
        tiposSeleccionados.value = tiposSeleccionados.value.filter(t => t !== id);
    };
    const obtenerNombreTipo = (id) => {
        const tipo = tipos.value.find(t => t.id === id);
        return tipo ? tipo.nombre : '';
    };
    const eliminarProducto = async (id) => {
        try {
            await eliminar(id);
        } catch (error) {
            return error;
        }
    }
    return {
        form,
        tiposSeleccionados, 
        imagenes,
        quitarTipo,
        agregarTipo,
        previews,
        handleFiles,
        guardarProducto,
        editarProducto,
        obtenerNombreTipo,
        editarProductoSubmit,
        eliminarProducto,
        detalleProducto,
        formCrear,
        formEditar
    };
}
