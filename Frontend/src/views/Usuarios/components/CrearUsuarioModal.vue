<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Modal } from 'bootstrap';
import Swal from 'sweetalert2';
import { createUsuario, getAssignableRoles } from '../../../services/usuarios';

const emit = defineEmits(['created']);
const modalElement = ref(null);
const submitting = ref(false);
const errors = ref({});
const roles = ref([]);
const showPassword = ref(false);
const showConfirmation = ref(false);

const regimenes = [
  ['601', 'General de Ley Personas Morales'], ['603', 'Personas Morales con Fines no Lucrativos'],
  ['605', 'Sueldos y Salarios'], ['606', 'Arrendamiento'], ['612', 'Personas Físicas con Actividades Empresariales'],
  ['616', 'Sin obligaciones fiscales'], ['621', 'Incorporación Fiscal'], ['625', 'Actividades Empresariales con ingresos por Plataformas'],
  ['626', 'Régimen Simplificado de Confianza'],
];
const usosCfdi = [
  ['G01', 'Adquisición de mercancías'], ['G02', 'Devoluciones, descuentos o bonificaciones'],
  ['G03', 'Gastos en general'], ['I01', 'Construcciones'], ['I02', 'Mobiliario y equipo de oficina'],
  ['I03', 'Equipo de transporte'], ['D01', 'Honorarios médicos'], ['D10', 'Pagos por servicios educativos'],
  ['S01', 'Sin efectos fiscales'], ['CP01', 'Pagos'], ['CN01', 'Nómina'],
];

const blankForm = () => ({
  tipoUsuario: '',
  datosUsuario: {
    Nombre: '', Apellido_p: '', Apellido_m: '', Calle: '', num_interior: '',
    num_exterior: '', poblacion: '', cp: '', colonia: '', rfc: '', descuento: 0, estatus: 1,
  },
  credenciales: { email: '', password: '', passwordConfirmation: '' },
  roles: [],
  datosFiscales: {
    tipoPersona: 'fisica', rfc: '', razonSocial: '', codigoPostal: '',
    regimenFiscal: '', usoCfdi: '', correo: '', telefono: '', esExtranjero: 2,
    residenciaFiscal: '', numRegIdTrib: '',
  },
});
const form = ref(blankForm());

const employeeRoles = computed(() => roles.value.filter((role) => role.clave !== 'cliente' && role.clave !== 'administrador'));
const selectedPermissions = computed(() => new Set(employeeRoles.value
  .filter((role) => form.value.roles.includes(role.clave))
  .flatMap((role) => role.permissions || [])));
const permissionGroups = computed(() => {
  const groups = {};
  for (const permission of employeeRoles.value.flatMap((role) => role.permissions || [])) {
    const [module] = permission.split('.');
    if (!groups[module]) groups[module] = new Set();
    groups[module].add(permission);
  }
  return Object.entries(groups).map(([module, permissions]) => ({ module, permissions: [...permissions].sort() }));
});

watch(() => form.value.tipoUsuario, (current, previous) => {
  if (!previous || current === previous) return;
  form.value.roles = [];
  form.value.datosFiscales = blankForm().datosFiscales;
  form.value.datosUsuario.rfc = '';
  errors.value = {};
});

const reset = () => {
  form.value = blankForm();
  errors.value = {};
  submitting.value = false;
  showPassword.value = false;
  showConfirmation.value = false;
};

const normalizeOptional = (value) => value?.trim() || null;
const validate = () => {
  const next = {};
  const value = form.value;
  if (!value.tipoUsuario) next.tipoUsuario = 'Selecciona si el usuario es cliente o empleado.';
  if (!value.datosUsuario.Nombre.trim()) next.Nombre = 'El nombre es obligatorio.';
  const email = value.credenciales.email.trim().toLowerCase();
  if (!email) next.email = 'El correo de acceso es obligatorio.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'El correo de acceso no es válido.';
  if (value.credenciales.password.length < 8) next.password = 'La contraseña debe tener al menos 8 caracteres.';
  if (value.credenciales.password !== value.credenciales.passwordConfirmation) next.passwordConfirmation = 'Las contraseñas no coinciden.';
  if (value.tipoUsuario === 'empleado' && !value.roles.length) next.roles = 'Selecciona al menos un rol.';
  if (value.tipoUsuario === 'cliente') {
    const fiscal = value.datosFiscales;
    if (!fiscal.rfc.trim()) next.rfcFiscal = 'El RFC fiscal es obligatorio.';
    if (!fiscal.razonSocial.trim()) next.razonSocial = 'La razón social es obligatoria.';
    if (!/^\d{5}$/.test(fiscal.codigoPostal)) next.codigoPostal = 'Captura un código postal fiscal de 5 dígitos.';
    if (!fiscal.regimenFiscal) next.regimenFiscal = 'Selecciona el régimen fiscal.';
    if (!fiscal.usoCfdi) next.usoCfdi = 'Selecciona el uso de CFDI.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fiscal.correo)) next.correoFiscal = 'El correo de facturación no es válido.';
    if (!/^\+?[0-9\s-]{7,20}$/.test(fiscal.telefono)) next.telefono = 'El teléfono no es válido.';
    if (Number(fiscal.esExtranjero) === 1) {
      if (!/^[A-Za-z]{3}$/.test(fiscal.residenciaFiscal)) next.residenciaFiscal = 'Captura el código de país de 3 letras.';
      if (!fiscal.numRegIdTrib.trim()) next.numRegIdTrib = 'El registro tributario extranjero es obligatorio.';
    }
  }
  errors.value = next;
  return !Object.keys(next).length;
};

const focusFirstError = async () => {
  await nextTick();
  const field = Object.keys(errors.value)[0];
  modalElement.value?.querySelector(`[data-field="${field}"]`)?.focus();
};
const inputClass = (field) => ({ 'is-invalid': Boolean(errors.value[field]) });

const cleanupOrphanedBackdrop = () => {
  if (document.querySelector('.modal.show')) return;
  document.querySelectorAll('.modal-backdrop').forEach((backdrop) => backdrop.remove());
  document.body.classList.remove('modal-open');
  document.body.style.removeProperty('overflow');
  document.body.style.removeProperty('padding-right');
};

const hideModal = () => new Promise((resolve) => {
  const element = modalElement.value;
  if (!element) {
    cleanupOrphanedBackdrop();
    resolve();
    return;
  }

  const instance = Modal.getOrCreateInstance(element);
  let completed = false;
  const finish = () => {
    if (completed) return;
    completed = true;
    clearTimeout(safetyTimeout);
    cleanupOrphanedBackdrop();
    resolve();
  };
  const safetyTimeout = window.setTimeout(finish, 1000);

  element.addEventListener('hidden.bs.modal', finish, { once: true });
  instance.hide();
});

const payload = () => {
  const source = form.value;
  const datosUsuario = Object.fromEntries(Object.entries(source.datosUsuario)
    .map(([key, value]) => [key, typeof value === 'string' ? normalizeOptional(value) : value]));
  datosUsuario.Nombre = source.datosUsuario.Nombre.trim();
  if (source.tipoUsuario === 'cliente') delete datosUsuario.rfc;
  const result = {
    tipoUsuario: source.tipoUsuario,
    datosUsuario,
    credenciales: {
      email: source.credenciales.email.trim().toLowerCase(),
      password: source.credenciales.password,
      passwordConfirmation: source.credenciales.passwordConfirmation,
    },
  };
  if (source.tipoUsuario === 'empleado') result.roles = [...source.roles];
  if (source.tipoUsuario === 'cliente') {
    const fiscal = source.datosFiscales;
    result.datosFiscales = {
      ...fiscal,
      rfc: fiscal.rfc.trim().toUpperCase(),
      razonSocial: fiscal.razonSocial.trim(),
      codigoPostal: fiscal.codigoPostal.trim(),
      regimenFiscal: fiscal.regimenFiscal,
      usoCfdi: fiscal.usoCfdi,
      correo: fiscal.correo.trim().toLowerCase(),
      telefono: fiscal.telefono.trim(),
      esExtranjero: Number(fiscal.esExtranjero),
      residenciaFiscal: Number(fiscal.esExtranjero) === 1 ? fiscal.residenciaFiscal.trim().toUpperCase() : undefined,
      numRegIdTrib: Number(fiscal.esExtranjero) === 1 ? fiscal.numRegIdTrib.trim() : undefined,
    };
  }
  return result;
};

const submit = async () => {
  if (submitting.value) return;
  if (!validate()) {
    await Swal.fire({ icon: 'error', title: 'Revisa el formulario', text: Object.values(errors.value)[0] });
    await focusFirstError();
    return;
  }
  submitting.value = true;
  try {
    await createUsuario(payload());
    await Swal.fire({ icon: 'success', title: 'Usuario registrado correctamente', confirmButtonText: 'Aceptar' });
    await hideModal();
    emit('created');
  } catch (error) {
    const messages = error.response?.data?.message;
    const text = Array.isArray(messages) ? messages.join('\n') : messages || 'No fue posible registrar el usuario.';
    await Swal.fire({ icon: 'error', title: 'No fue posible registrar el usuario', text });
  } finally {
    submitting.value = false;
  }
};

const handleHidden = () => reset();
onMounted(async () => {
  modalElement.value?.addEventListener('hidden.bs.modal', handleHidden);
  roles.value = (await getAssignableRoles()).data;
});
onBeforeUnmount(() => modalElement.value?.removeEventListener('hidden.bs.modal', handleHidden));
</script>

<template>
  <div id="creacion" ref="modalElement" class="modal fade" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
      <div class="modal-content modal-producto">
        <div class="modal-header">
          <div><h5 class="modal-title fw-bold">Registrar usuario</h5><small class="text-muted">Cliente o empleado con acceso al sistema</small></div>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar" />
        </div>
        <div class="modal-body">
          <div class="form-section">
            <label class="form-label fw-semibold">¿El usuario es cliente o empleado? *</label>
            <select v-model="form.tipoUsuario" data-field="tipoUsuario" class="form-select" :class="inputClass('tipoUsuario')">
              <option value="">Seleccione una opción</option><option value="cliente">Cliente</option><option value="empleado">Empleado</option>
            </select><div class="invalid-feedback">{{ errors.tipoUsuario }}</div>
          </div>

          <template v-if="form.tipoUsuario">
            <div class="form-section mt-4"><h6 class="section-title">Datos personales</h6><div class="row g-3">
              <div class="col-md-4"><label class="form-label">Nombre *</label><input v-model="form.datosUsuario.Nombre" data-field="Nombre" class="form-control" :class="inputClass('Nombre')"><div class="invalid-feedback">{{ errors.Nombre }}</div></div>
              <div class="col-md-4"><label class="form-label">Apellido paterno</label><input v-model="form.datosUsuario.Apellido_p" class="form-control"></div>
              <div class="col-md-4"><label class="form-label">Apellido materno</label><input v-model="form.datosUsuario.Apellido_m" class="form-control"></div>
              <div v-if="form.tipoUsuario === 'empleado'" class="col-md-4"><label class="form-label">RFC</label><input v-model="form.datosUsuario.rfc" class="form-control text-uppercase" maxlength="13"></div>
              <div class="col-md-8"><label class="form-label">Calle</label><input v-model="form.datosUsuario.Calle" class="form-control"></div>
              <div class="col-md-2"><label class="form-label">Núm. exterior</label><input v-model="form.datosUsuario.num_exterior" class="form-control"></div>
              <div class="col-md-2"><label class="form-label">Núm. interior</label><input v-model="form.datosUsuario.num_interior" class="form-control"></div>
              <div class="col-md-4"><label class="form-label">Colonia</label><input v-model="form.datosUsuario.colonia" class="form-control"></div>
              <div class="col-md-4"><label class="form-label">Población</label><input v-model="form.datosUsuario.poblacion" class="form-control"></div>
              <div class="col-md-4"><label class="form-label">Código postal de contacto</label><input v-model="form.datosUsuario.cp" maxlength="5" class="form-control"></div>
              <div class="col-md-4"><label class="form-label">Estado</label><select v-model.number="form.datosUsuario.estatus" class="form-select"><option :value="1">Activo</option><option :value="2">Inactivo</option></select></div>
              <div class="col-md-4"><label class="form-label">Descuento (%)</label><input v-model.number="form.datosUsuario.descuento" type="number" min="0" max="100" class="form-control"></div>
            </div></div>

            <div v-if="form.tipoUsuario === 'cliente'" class="form-section mt-4"><h6 class="section-title">Información fiscal</h6><div class="row g-3">
              <div class="col-md-4"><label class="form-label">¿Es extranjero? *</label><select v-model.number="form.datosFiscales.esExtranjero" class="form-select"><option :value="2">No</option><option :value="1">Sí</option></select></div>
              <div class="col-md-4"><label class="form-label">Tipo de persona *</label><select v-model="form.datosFiscales.tipoPersona" class="form-select"><option value="fisica">Física</option><option value="moral">Moral</option></select></div>
              <div class="col-md-4"><label class="form-label">RFC fiscal *</label><input v-model="form.datosFiscales.rfc" data-field="rfcFiscal" maxlength="13" class="form-control text-uppercase" :class="inputClass('rfcFiscal')"><div class="invalid-feedback">{{ errors.rfcFiscal }}</div></div>
              <div class="col-md-8"><label class="form-label">Razón social o nombre fiscal *</label><input v-model="form.datosFiscales.razonSocial" data-field="razonSocial" class="form-control" :class="inputClass('razonSocial')"><div class="invalid-feedback">{{ errors.razonSocial }}</div></div>
              <div class="col-md-4"><label class="form-label">Código postal fiscal *</label><input v-model="form.datosFiscales.codigoPostal" data-field="codigoPostal" maxlength="5" class="form-control" :class="inputClass('codigoPostal')"><div class="invalid-feedback">{{ errors.codigoPostal }}</div></div>
              <div class="col-md-6"><label class="form-label">Régimen fiscal *</label><select v-model="form.datosFiscales.regimenFiscal" data-field="regimenFiscal" class="form-select" :class="inputClass('regimenFiscal')"><option value="">Seleccione</option><option v-for="item in regimenes" :key="item[0]" :value="item[0]">{{ item[0] }} — {{ item[1] }}</option></select><div class="invalid-feedback">{{ errors.regimenFiscal }}</div></div>
              <div class="col-md-6"><label class="form-label">Uso del CFDI *</label><select v-model="form.datosFiscales.usoCfdi" data-field="usoCfdi" class="form-select" :class="inputClass('usoCfdi')"><option value="">Seleccione</option><option v-for="item in usosCfdi" :key="item[0]" :value="item[0]">{{ item[0] }} — {{ item[1] }}</option></select><div class="invalid-feedback">{{ errors.usoCfdi }}</div></div>
              <div class="col-md-6"><label class="form-label">Correo de facturación *</label><input v-model="form.datosFiscales.correo" data-field="correoFiscal" type="email" class="form-control" :class="inputClass('correoFiscal')"><div class="invalid-feedback">{{ errors.correoFiscal }}</div></div>
              <div class="col-md-6"><label class="form-label">Teléfono *</label><input v-model="form.datosFiscales.telefono" data-field="telefono" class="form-control" :class="inputClass('telefono')"><div class="invalid-feedback">{{ errors.telefono }}</div></div>
              <template v-if="form.datosFiscales.esExtranjero === 1"><div class="col-md-4"><label class="form-label">Residencia fiscal (ISO 3) *</label><input v-model="form.datosFiscales.residenciaFiscal" data-field="residenciaFiscal" maxlength="3" class="form-control text-uppercase" :class="inputClass('residenciaFiscal')"><div class="invalid-feedback">{{ errors.residenciaFiscal }}</div></div><div class="col-md-8"><label class="form-label">Número de registro tributario *</label><input v-model="form.datosFiscales.numRegIdTrib" data-field="numRegIdTrib" maxlength="40" class="form-control" :class="inputClass('numRegIdTrib')"><div class="invalid-feedback">{{ errors.numRegIdTrib }}</div></div></template>
            </div></div>

            <div class="form-section mt-4"><h6 class="section-title">Acceso al sistema</h6><div class="row g-3">
              <div class="col-md-6"><label class="form-label">Correo de acceso *</label><input v-model="form.credenciales.email" data-field="email" type="email" class="form-control" :class="inputClass('email')"><div class="invalid-feedback">{{ errors.email }}</div></div>
              <div class="col-md-3"><label class="form-label">Contraseña *</label><div class="input-group"><input v-model="form.credenciales.password" data-field="password" :type="showPassword ? 'text' : 'password'" class="form-control" :class="inputClass('password')"><button class="btn btn-outline-secondary" type="button" @click="showPassword = !showPassword"><i class="bi bi-eye" /></button><div class="invalid-feedback">{{ errors.password }}</div></div></div>
              <div class="col-md-3"><label class="form-label">Confirmar *</label><div class="input-group"><input v-model="form.credenciales.passwordConfirmation" data-field="passwordConfirmation" :type="showConfirmation ? 'text' : 'password'" class="form-control" :class="inputClass('passwordConfirmation')"><button class="btn btn-outline-secondary" type="button" @click="showConfirmation = !showConfirmation"><i class="bi bi-eye" /></button><div class="invalid-feedback">{{ errors.passwordConfirmation }}</div></div></div>
              <div v-if="form.tipoUsuario === 'cliente'" class="col-12"><div class="alert alert-info mb-0">El cliente recibirá automáticamente el rol Cliente y tendrá acceso exclusivamente web.</div></div>
            </div></div>

            <div v-if="form.tipoUsuario === 'empleado'" class="form-section mt-4"><h6 class="section-title">Roles y permisos</h6>
              <div data-field="roles" class="d-flex flex-wrap gap-3" :class="{ 'border border-danger rounded p-2': errors.roles }"><label v-for="role in employeeRoles" :key="role.clave" class="form-check"><input v-model="form.roles" class="form-check-input" type="checkbox" :value="role.clave"><span class="form-check-label ms-1">{{ role.nombre }}</span></label></div><div class="text-danger small">{{ errors.roles }}</div>
              <div v-if="form.roles.length" class="row g-3 mt-1"><div v-for="group in permissionGroups" :key="group.module" class="col-md-4"><div class="card h-100"><div class="card-body py-2"><strong class="text-capitalize">{{ group.module }}</strong><div v-for="permission in group.permissions" :key="permission" class="small"><span :class="selectedPermissions.has(permission) ? 'text-success' : 'text-muted'">{{ selectedPermissions.has(permission) ? '✓' : '✗' }}</span> {{ permission.split('.')[1].replaceAll('_', ' ') }}</div></div></div></div></div>
            </div>
          </template>
        </div>
        <div class="modal-footer"><button type="button" class="btn btn-light" data-bs-dismiss="modal" :disabled="submitting">Cancelar</button><button type="button" class="btn btn-primary" :disabled="submitting || !form.tipoUsuario" @click="submit"><span v-if="submitting" class="spinner-border spinner-border-sm me-2" />{{ submitting ? 'Registrando…' : 'Registrar usuario' }}</button></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-body { max-height: 72vh; }
.form-section { background: var(--bs-body-bg); border: 1px solid var(--bs-border-color); border-radius: .75rem; padding: 1rem; }
.section-title { margin-bottom: 1rem; font-weight: 700; }
@media (max-width: 576px) { .modal-dialog { margin: .5rem; } .form-section { padding: .75rem; } }
</style>
