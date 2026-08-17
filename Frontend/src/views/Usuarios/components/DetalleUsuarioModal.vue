<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { Modal } from "bootstrap";
import Swal from "sweetalert2";
import { getUsuario } from "../../../services/usuarios";
const modal = ref(null),
  loading = ref(false),
  user = ref(null);
const type = computed(() =>
  String(
    user.value?.tipoUsuario || user.value?.identidad || "",
  ).toLowerCase() === "cliente"
    ? "Cliente"
    : "Empleado",
);
const groups = computed(() => {
  const g = {};
  for (const p of user.value?.acceso?.permissions || []) {
    const [m] = p.split(".");
    (g[m] ??= []).push(p);
  }
  return g;
});
const open = async (id) => {
  user.value = null;
  loading.value = true;
  Modal.getOrCreateInstance(modal.value).show();
  try {
    user.value = (await getUsuario(id)).data;
  } catch (e) {
    Modal.getInstance(modal.value)?.hide();
    await Swal.fire(
      "No fue posible cargar los detalles",
      e.response?.data?.message || "Error de conexión",
      "error",
    );
  } finally {
    loading.value = false;
  }
};
defineExpose({ open });
const reset = () => {
  user.value = null;
  loading.value = false;
};
onMounted(() => modal.value?.addEventListener("hidden.bs.modal", reset));
onBeforeUnmount(() => modal.value?.removeEventListener("hidden.bs.modal", reset));
</script>
<template>
  <div
    ref="modal"
    class="modal fade"
    tabindex="-1"
  >
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
      <div class="modal-content modal-producto">
        <div class="modal-header">
          <h5>Detalles del usuario</h5>
          <button class="btn-close" data-bs-dismiss="modal" />
        </div>
        <div class="modal-body">
          <div v-if="loading" class="text-center p-5">
            <span class="spinner-border" />
          </div>
          <template v-else-if="user"
            ><div class="d-flex gap-2 mb-3">
              <span class="badge text-bg-primary">{{ type }}</span
              ><span
                class="badge"
                :class="
                  user.estatus === 1 ? 'text-bg-success' : 'text-bg-danger'
                "
                >{{ user.estatus === 1 ? "Activo" : "Inactivo" }}</span
              >
            </div>
            <dl class="row">
              <dt class="col-sm-4">ID</dt>
              <dd class="col-sm-8">{{ user.id }}</dd>
              <dt class="col-sm-4">Nombre</dt>
              <dd class="col-sm-8">
                {{
                  [user.Nombre, user.Apellido_p, user.Apellido_m]
                    .filter(Boolean)
                    .join(" ")
                }}
              </dd>
              <dt class="col-sm-4">Dirección</dt>
              <dd class="col-sm-8">
                {{
                  [
                    user.Calle,
                    user.num_exterior,
                    user.num_interior,
                    user.colonia,
                    user.poblacion,
                    user.cp,
                  ]
                    .filter(Boolean)
                    .join(", ") || "No registrada"
                }}
              </dd>
              <dt class="col-sm-4">Email de acceso</dt>
              <dd class="col-sm-8">{{ user.email }}</dd>
              <dt class="col-sm-4">Descuento</dt>
              <dd class="col-sm-8">{{ Number(user.descuento || 0) }}%</dd>
              <dt class="col-sm-4">Canal</dt>
              <dd class="col-sm-8">{{ user.canalAcceso || "No definido" }}</dd>
              <dt class="col-sm-4">Fecha de creación</dt>
              <dd class="col-sm-8">{{ user.fecha_creacion }}</dd>
              <dt class="col-sm-4">Roles</dt>
              <dd class="col-sm-8">
                {{ user.acceso?.roles?.join(", ") || "Sin roles" }}
              </dd>
            </dl>
            <div v-if="type === 'Cliente' && user.datosFiscales">
              <h6>Información fiscal</h6>
              <dl class="row">
                <template
                  v-for="[label, key] in [
                    ['Tipo de persona', 'tipoPersona'],
                    ['RFC', 'rfc'],
                    ['Razón social', 'razonSocial'],
                    ['Código postal', 'codigoPostal'],
                    ['Régimen fiscal', 'regimenFiscal'],
                    ['Uso CFDI', 'usoCfdi'],
                    ['Correo de facturación', 'correo'],
                    ['Teléfono', 'telefono'],
                    ['Residencia fiscal', 'residenciaFiscal'],
                    ['Registro tributario', 'numRegIdTrib'],
                  ]"
                  :key="key"
                  ><dt class="col-sm-4">{{ label }}</dt>
                  <dd class="col-sm-8">
                    {{ user.datosFiscales[key] || "No aplica" }}
                  </dd></template
                >
              </dl>
            </div>
            <div v-if="type === 'Empleado'">
              <h6>Permisos efectivos</h6>
              <div v-for="(items, module) in groups" :key="module" class="mb-2">
                <strong class="text-capitalize">{{ module }}</strong>
                <div>
                  <span
                    v-for="p in items"
                    :key="p"
                    class="badge text-bg-secondary me-1"
                    >{{ p.split(".")[1] }}</span
                  >
                </div>
              </div>
            </div></template
          >
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" data-bs-dismiss="modal">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
