<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { Modal } from "bootstrap";
import Swal from "sweetalert2";
import {
  getAssignableRoles,
  getUsuario,
  updateUsuario,
} from "../../../services/usuarios";
const emit = defineEmits(["updated"]);
const modal = ref(null),
  loading = ref(false),
  saving = ref(false),
  user = ref(null),
  roles = ref([]),
  errors = ref({});
const blank = () => ({
  tipoUsuario: "",
  datosUsuario: {
    Nombre: "",
    Apellido_p: "",
    Apellido_m: "",
    Calle: "",
    num_interior: "",
    num_exterior: "",
    poblacion: "",
    cp: "",
    colonia: "",
    descuento: 0,
    estatusAcceso: 1,
  },
  email: "",
  roles: [],
  datosFiscales: null,
  cambioPassword: { nueva: "", confirmacion: "" },
});
const form = ref(blank());
const employeeRoles = computed(() =>
  roles.value.filter((r) => !["cliente", "administrador"].includes(r.clave)),
);
const permissions = computed(() => [
  ...new Set(
    employeeRoles.value
      .filter((r) => form.value.roles.includes(r.clave))
      .flatMap((r) => r.permissions || []),
  ),
]);
const reset = () => {
  user.value = null;
  form.value = blank();
  errors.value = {};
  loading.value = false;
  saving.value = false;
};
const open = async (id) => {
  reset();
  Modal.getOrCreateInstance(modal.value).show();
  loading.value = true;
  try {
    const [{ data }, rr] = await Promise.all([
      getUsuario(id),
      getAssignableRoles(),
    ]);
    roles.value = rr.data;
    user.value = data;
    const type =
      String(data.tipoUsuario || data.identidad).toLowerCase() === "cliente"
        ? "cliente"
        : "empleado";
    form.value = {
      tipoUsuario: type,
      datosUsuario: {
        Nombre: data.Nombre || "",
        Apellido_p: data.Apellido_p || "",
        Apellido_m: data.Apellido_m || "",
        Calle: data.Calle || "",
        num_interior: data.num_interior || "",
        num_exterior: data.num_exterior || "",
        poblacion: data.poblacion || "",
        cp: data.cp || "",
        colonia: data.colonia || "",
        descuento: Number(data.descuento || 0),
        estatusAcceso: Number(data.estatusAcceso || 1),
      },
      email: data.email || "",
      roles: (data.acceso?.roles || []).filter(
        (x) => !["cliente", "administrador"].includes(x),
      ),
      datosFiscales:
        type === "cliente"
          ? {
              tipoPersona: data.datosFiscales?.tipoPersona || "fisica",
              rfc: data.datosFiscales?.rfc || "",
              razonSocial: data.datosFiscales?.razonSocial || "",
              codigoPostal: data.datosFiscales?.codigoPostal || "",
              regimenFiscal: data.datosFiscales?.regimenFiscal || "",
              usoCfdi: data.datosFiscales?.usoCfdi || "",
              correo: data.datosFiscales?.correo || "",
              telefono: data.datosFiscales?.telefono || "",
              esExtranjero: Number(data.datosFiscales?.esExtranjero || 2),
              residenciaFiscal: data.datosFiscales?.residenciaFiscal || "",
              numRegIdTrib: data.datosFiscales?.numRegIdTrib || "",
            }
          : null,
      cambioPassword: { nueva: "", confirmacion: "" },
    };
  } catch (e) {
    Modal.getInstance(modal.value)?.hide();
    await Swal.fire(
      "No fue posible cargar el usuario",
      e.response?.data?.message || "Error de conexión",
      "error",
    );
  } finally {
    loading.value = false;
  }
};
const save = async () => {
  errors.value = {};
  if (!form.value.datosUsuario.Nombre.trim())
    errors.value.Nombre = "El nombre es obligatorio";
  if (!form.value.email) errors.value.email = "El correo es obligatorio";
  if (form.value.tipoUsuario === "empleado" && !form.value.roles.length)
    errors.value.roles = "Selecciona al menos un rol";
  if (
    form.value.cambioPassword.nueva !== form.value.cambioPassword.confirmacion
  )
    errors.value.password = "Las contraseñas no coinciden";
  if (Object.keys(errors.value).length) return;
  saving.value = true;
  try {
    const body = structuredClone(form.value);
    if (!body.cambioPassword.nueva) delete body.cambioPassword;
    if (body.tipoUsuario === "cliente") delete body.roles;
    else delete body.datosFiscales;
    await updateUsuario(user.value.id, body);
    await Swal.fire("Usuario actualizado correctamente", "", "success");
    Modal.getInstance(modal.value)?.hide();
    emit("updated");
  } catch (e) {
    await Swal.fire(
      "No fue posible actualizar el usuario",
      Array.isArray(e.response?.data?.message)
        ? e.response.data.message.join("\n")
        : e.response?.data?.message || "Error de conexión",
      "error",
    );
  } finally {
    saving.value = false;
  }
};
defineExpose({ open });
onMounted(() => modal.value?.addEventListener("hidden.bs.modal", reset));
onBeforeUnmount(() => modal.value?.removeEventListener("hidden.bs.modal", reset));
</script>
<template>
  <div ref="modal" class="modal fade" tabindex="-1">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
      <div class="modal-content modal-producto">
        <div class="modal-header">
          <h5>Editar usuario</h5>
          <button class="btn-close" data-bs-dismiss="modal" />
        </div>
        <div class="modal-body">
          <div v-if="loading" class="text-center p-5">
            <span class="spinner-border" />
          </div>
          <template v-else-if="user"
            ><div class="alert alert-secondary">
              Tipo:
              <strong class="text-capitalize">{{ form.tipoUsuario }}</strong>
              (no modificable)
            </div>
            <div class="row g-3">
              <div class="col-md-4">
                <label>Nombre *</label
                ><input
                  v-model="form.datosUsuario.Nombre"
                  class="form-control"
                /><small class="text-danger">{{ errors.Nombre }}</small>
              </div>
              <div class="col-md-4">
                <label>Apellido paterno</label
                ><input
                  v-model="form.datosUsuario.Apellido_p"
                  class="form-control"
                />
              </div>
              <div class="col-md-4">
                <label>Apellido materno</label
                ><input
                  v-model="form.datosUsuario.Apellido_m"
                  class="form-control"
                />
              </div>
              <div class="col-md-6">
                <label>Calle</label
                ><input
                  v-model="form.datosUsuario.Calle"
                  class="form-control"
                />
              </div>
              <div class="col-md-3">
                <label>Núm. exterior</label
                ><input
                  v-model="form.datosUsuario.num_exterior"
                  class="form-control"
                />
              </div>
              <div class="col-md-3">
                <label>Núm. interior</label
                ><input
                  v-model="form.datosUsuario.num_interior"
                  class="form-control"
                />
              </div>
              <div class="col-md-4">
                <label>Colonia</label
                ><input
                  v-model="form.datosUsuario.colonia"
                  class="form-control"
                />
              </div>
              <div class="col-md-4">
                <label>Población</label
                ><input
                  v-model="form.datosUsuario.poblacion"
                  class="form-control"
                />
              </div>
              <div class="col-md-4">
                <label>CP domicilio</label
                ><input v-model="form.datosUsuario.cp" class="form-control" />
              </div>
              <div class="col-md-4">
                <label>Descuento %</label
                ><input
                  v-model.number="form.datosUsuario.descuento"
                  type="number"
                  min="0"
                  max="100"
                  class="form-control"
                />
              </div>
              <div class="col-md-4">
                <label>Estado de acceso</label
                ><select
                  v-model.number="form.datosUsuario.estatusAcceso"
                  class="form-select"
                >
                  <option :value="1">Activo</option>
                  <option :value="2">Inactivo</option>
                </select>
              </div>
              <div class="col-md-4">
                <label>Email *</label
                ><input
                  v-model="form.email"
                  type="email"
                  class="form-control"
                /><small class="text-danger">{{ errors.email }}</small>
              </div>
            </div>
            <div v-if="form.tipoUsuario === 'cliente'" class="mt-4">
              <h6>Información fiscal</h6>
              <div class="row g-3">
                <div class="col-md-4">
                  <label>Tipo persona</label
                  ><select
                    v-model="form.datosFiscales.tipoPersona"
                    class="form-select"
                  >
                    <option value="fisica">Física</option>
                    <option value="moral">Moral</option>
                  </select>
                </div>
                <div class="col-md-4">
                  <label>RFC</label
                  ><input
                    v-model="form.datosFiscales.rfc"
                    class="form-control"
                  />
                </div>
                <div class="col-md-4">
                  <label>Razón social</label
                  ><input
                    v-model="form.datosFiscales.razonSocial"
                    class="form-control"
                  />
                </div>
                <div class="col-md-3">
                  <label>CP fiscal</label
                  ><input
                    v-model="form.datosFiscales.codigoPostal"
                    class="form-control"
                  />
                </div>
                <div class="col-md-3">
                  <label>Régimen</label
                  ><input
                    v-model="form.datosFiscales.regimenFiscal"
                    class="form-control"
                  />
                </div>
                <div class="col-md-3">
                  <label>Uso CFDI</label
                  ><input
                    v-model="form.datosFiscales.usoCfdi"
                    class="form-control"
                  />
                </div>
                <div class="col-md-3">
                  <label>Teléfono</label
                  ><input
                    v-model="form.datosFiscales.telefono"
                    class="form-control"
                  />
                </div>
                <div class="col-md-6">
                  <label>Correo facturación</label
                  ><input
                    v-model="form.datosFiscales.correo"
                    class="form-control"
                  />
                </div>
                <div class="col-md-3">
                  <label>Extranjero</label
                  ><select
                    v-model.number="form.datosFiscales.esExtranjero"
                    class="form-select"
                  >
                    <option :value="2">No</option>
                    <option :value="1">Sí</option>
                  </select>
                </div>
                <template v-if="form.datosFiscales.esExtranjero === 1"
                  ><div class="col-md-3">
                    <label>Residencia ISO3</label
                    ><input
                      v-model="form.datosFiscales.residenciaFiscal"
                      class="form-control"
                    />
                  </div>
                  <div class="col-md-6">
                    <label>Registro tributario</label
                    ><input
                      v-model="form.datosFiscales.numRegIdTrib"
                      class="form-control"
                    /></div
                ></template>
              </div>
            </div>
            <div v-else class="mt-4">
              <h6>Roles</h6>
              <label
                v-for="r in employeeRoles"
                :key="r.clave"
                class="form-check form-check-inline"
                ><input
                  v-model="form.roles"
                  :value="r.clave"
                  type="checkbox"
                  class="form-check-input"
                />{{ r.nombre }}</label
              >
              <div class="text-danger">{{ errors.roles }}</div>
              <div class="mt-2">
                <span
                  v-for="p in permissions"
                  :key="p"
                  class="badge text-bg-secondary me-1"
                  >{{ p }}</span
                >
              </div>
            </div>
            <div class="mt-4">
              <h6>Cambiar contraseña (opcional)</h6>
              <div class="row g-3">
                <div class="col-md-6">
                  <input
                    v-model="form.cambioPassword.nueva"
                    type="password"
                    placeholder="Nueva contraseña"
                    class="form-control"
                  />
                </div>
                <div class="col-md-6">
                  <input
                    v-model="form.cambioPassword.confirmacion"
                    type="password"
                    placeholder="Confirmar"
                    class="form-control"
                  />
                </div>
                <div class="text-danger">{{ errors.password }}</div>
              </div>
            </div></template
          >
        </div>
        <div class="modal-footer">
          <button class="btn btn-light" data-bs-dismiss="modal">Cancelar</button
          ><button
            class="btn btn-success"
            :disabled="saving || loading"
            @click="save"
          >
            {{ saving ? "Guardando…" : "Guardar" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
