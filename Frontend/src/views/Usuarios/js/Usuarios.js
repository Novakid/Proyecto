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
    identidad: 'Cliente', tendraAcceso: false, email: '', password: '', passwordConfirm: '', roles: [],
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
            identidad: 'Cliente', tendraAcceso: false, email: '', password: '', passwordConfirm: '', roles: [],
        };
    };
    const guardarUsuario = async () => {
        if (formCrear.value.tendraAcceso && formCrear.value.password !== formCrear.value.passwordConfirm) throw new Error('Las contraseñas no coinciden');
        const payload = { ...formCrear.value };
        delete payload.tendraAcceso; delete payload.passwordConfirm;
        if (payload.roles) payload.roles = payload.roles.filter((role) => payload.identidad === 'Cliente' ? role === 'cliente' : role !== 'cliente');
        if (!formCrear.value.tendraAcceso) {
            delete payload.email;
            delete payload.password;
            delete payload.roles;
        }
        await crear(payload);
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
            identidad: response.data.identidad ?? 'Cliente', email: response.data.email ?? '', password: '', roles: (response.data.acceso?.roles || []).filter((role) => ['dev', 'facturista', 'vendedor', 'almacen', 'cliente'].includes(role)),
        };
    };
    const actualizarUsuario = async() => {
        if (!usuarioSeleccionado.value?.id) return;
        const payload = { ...formEditar.value, password: formEditar.value.password || undefined };
        payload.roles = (payload.roles || []).filter((role) => payload.identidad === 'Cliente' ? role === 'cliente' : role !== 'cliente');
        await actualizar(
            usuarioSeleccionado.value.id,
            payload
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
