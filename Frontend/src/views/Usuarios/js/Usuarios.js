import { ref } from "vue";
import { useUsuarios } from "../../../services/usuarios/useUsuarios";

const formCrear = ref({
    Nombre: '',
    Apellido_p: '',
    Apellido_m: '',
    rfc: '',
    Calle: '',
    num_interior: '',
    num_exterior: '',
    colonia: '',
    poblacion: '',
    cp: '',
    estatus: 1,
    identidad: 'Cliente',
});
const detalle = ref({
    Nombre: '',
    Apellido_p: '',
    Apellido_m: '',
    Calle: '',
    num_interior: '',
    num_exterior: '',
    colonia: '',
    poblacion: '',
    cp: '',
    rfc: '',
    identidad: '',
    estatus: 1,
    descuento: 0,
    fecha_creacion: ''
});
const formEditar = ref({});
const usuarioSeleccionado = ref(null);

export function useUsuarioForm() {
    const { crear, eliminar, obtenerUsuario, actualizar} = useUsuarios();
    // Limpiar formulario
    const limpiarFormulario = () => {
        formCrear.value = {
            Nombre: '',
            Apellido_p: '',
            Apellido_m: '',
            rfc: '',
            Calle: '',
            num_interior: '',
            num_exterior: '',
            colonia: '',
            poblacion: '',
            cp: '',
            estatus: 1,
            identidad: 'Cliente',
        };
    };
    const guardarUsuario = async () => {
        await crear(formCrear.value);
        limpiarFormulario();
    };
    const cargarUsuario = async(id) => {
        const response = await obtenerUsuario(id);
        usuarioSeleccionado.value = response.data;
        formEditar.value = {
            Nombre: response.data.Nombre ?? '',
            Apellido_p: response.data.Apellido_p ?? '',
            Apellido_m: response.data.Apellido_m ?? '',
            rfc: response.data.rfc ?? '',
            Calle: response.data.Calle ?? '',
            num_interior: response.data.num_interior ?? '',
            num_exterior: response.data.num_exterior ?? '',
            colonia: response.data.colonia ?? '',
            poblacion: response.data.poblacion ?? '',
            cp: response.data.cp ?? '',
            descuento: Number(response.data.descuento ?? 0),
            estatus: Number(response.data.estatus ?? 1),
            identidad: response.data.identidad ?? 'Cliente',
        };
    };
    const actualizarUsuario = async() => {
        if (!usuarioSeleccionado.value?.id) return;
        await actualizar(
            usuarioSeleccionado.value.id,
            { ...formEditar.value }
        );

        formEditar.value = {};

    };
    const eliminarUsuario = async(id) => {

        await eliminar(id);

    };
    const detalleUsuario = async (id) => {
        const resp = await obtenerUsuario(id);
        detalle.value = resp.data;
    }
    return {
        detalle,
        formCrear,
        formEditar,
        usuarioSeleccionado,
        detalleUsuario,
        guardarUsuario,
        cargarUsuario,
        editarUsuario: cargarUsuario,
        actualizarUsuario,
        eliminarUsuario,
        limpiarFormulario
    };
}
