import { computed, reactive, ref } from "vue";
import {
  buscarClientesCotizacion,
  buscarProductosCotizacion,
  buscarVendedoresCotizacion,
  crearCotizacion,
  editarCotizacion,
} from "../../../services/cotizaciones";

const emptyClient = () => ({
  nombre: "",
  tipoPersona: "",
  rfc: "",
  razonSocial: "",
  codigoPostal: "",
  regimenFiscal: "",
  usoCfdi: "",
  correo: "",
  telefono: "",
  extranjero: "",
  residenciaFiscal: "",
  registroTributario: "",
  direccion: "",
  colonia: "",
  poblacion: "",
});
const blank = () => ({
  folioEspecial: "",
  clienteId: null,
  clienteTexto: "",
  clienteDatos: emptyClient(),
  vendedorId: null,
  vendedorTexto: "",
  metodoPago: "Efectivo",
  credito: false,
  almacen: "",
  fechaVigencia: "",
  fechaEntrega: "",
  observaciones: "",
  conceptos: [],
});

function currentUser() {
  try {
    return JSON.parse(localStorage.getItem("current_user") || "null");
  } catch {
    return null;
  }
}

export function useCotizacionForm(onSaved) {
  const visible = ref(false),
    saving = ref(false),
    editingId = ref(null),
    searchProduct = ref("");
  const form = reactive(blank());
  const suggestions = reactive({ productos: [], clientes: [], vendedores: [] });
  const timers = {};
  const controllers = {};
  const subtotal = computed(() =>
    form.conceptos.reduce(
      (sum, x) => sum + Number(x.precio) * Number(x.cantidad),
      0,
    ),
  );
  const descuento = computed(() =>
    form.conceptos.reduce(
      (sum, x) =>
        sum +
        (Number(x.precio) * Number(x.cantidad) * Number(x.descuento)) / 100,
      0,
    ),
  );
  const iva = computed(() => (subtotal.value - descuento.value) * 0.16);
  const total = computed(() => subtotal.value - descuento.value + iva.value);
  function reset() {
    Object.assign(form, blank());
    editingId.value = null;
    searchProduct.value = "";
    Object.values(suggestions).forEach((x) => x.splice(0));
  }
  function open(quote = null) {
    reset();
    if (quote) {
      editingId.value = quote.id;
      const fiscal = quote.datosFiscalesSnapshot || {};
      Object.assign(form, {
        folioEspecial: quote.folioEspecial || "",
        clienteId: quote.clienteId,
        clienteTexto: fiscal.razon_social || "",
        clienteDatos: {
          nombre: fiscal.razon_social || "",
          tipoPersona: fiscal.tipo_persona || "",
          rfc: fiscal.rfc || "",
          razonSocial: fiscal.razon_social || "",
          codigoPostal: fiscal.codigo_postal || "",
          regimenFiscal: fiscal.regimen_fiscal || "",
          usoCfdi: fiscal.uso_cfdi || "",
          correo: fiscal.correo || "",
          telefono: fiscal.telefono || "",
          extranjero: Number(fiscal.es_extranjero) === 1 ? "Sí" : "No",
          residenciaFiscal: fiscal.residencia_fiscal || "",
          registroTributario: fiscal.num_reg_id_trib || "",
          direccion: fiscal.direccion || "",
          colonia: fiscal.colonia || "",
          poblacion: fiscal.poblacion || "",
        },
        vendedorId: quote.vendedorId,
        vendedorTexto: quote.vendedorNombre || `Vendedor #${quote.vendedorId}`,
        metodoPago: quote.metodoPago || "Efectivo",
        credito: Boolean(quote.credito),
        almacen: quote.almacen || "",
        fechaVigencia: quote.fechaVigencia?.slice(0, 10) || "",
        fechaEntrega: quote.fechaEntrega?.slice(0, 10) || "",
        observaciones: quote.observaciones || "",
        conceptos: (quote.detalles || []).map((x) => ({
          productoId: x.productoId,
          codigo: x.codigoProducto,
          descripcion: x.nombreProducto,
          existencia: 999999,
          precio: Number(x.precioUnitario),
          cantidad: Number(x.cantidad),
          descuento: Number(x.descuento),
          imagenes: [],
        })),
      });
    } else {
      const user = currentUser();
      if (Number.isInteger(Number(user?.id))) {
        form.vendedorId = Number(user.id);
        form.vendedorTexto = user.nombre || "";
      }
    }
    visible.value = true;
  }
  function debounce(kind, text, request) {
    clearTimeout(timers[kind]);
    controllers[kind]?.abort();
    suggestions[kind].splice(0);
    if (text.trim().length < (kind === "productos" ? 1 : 4)) return;
    timers[kind] = setTimeout(async () => {
      controllers[kind] = new AbortController();
      try {
        const { data } = await request(text.trim(), controllers[kind].signal);
        suggestions[kind].splice(
          0,
          suggestions[kind].length,
          ...(Array.isArray(data) ? data : []),
        );
      } catch (e) {
        if (e.code !== "ERR_CANCELED") console.error(e);
      }
    }, 300);
  }
  const findProducts = () =>
    debounce("productos", searchProduct.value, buscarProductosCotizacion);
  const findClients = () => {
    if (form.clienteTexto !== form.clienteDatos.nombre) {
      form.clienteId = null;
      form.clienteDatos = emptyClient();
    }
    debounce("clientes", form.clienteTexto, buscarClientesCotizacion);
  };
  const findSellers = () => {
    form.vendedorId = null;
    debounce("vendedores", form.vendedorTexto, buscarVendedoresCotizacion);
  };
  function selectClient(x) {
    const f = x.datosFiscales || {};
    form.clienteId = x.id;
    form.clienteTexto = x.nombre;
    form.clienteDatos = {
      nombre: x.nombre || "",
      tipoPersona: f.tipoPersona || "",
      rfc: f.rfc || "",
      razonSocial: f.razonSocial || "",
      codigoPostal: f.codigoPostal || x.codigoPostalUsuario || "",
      regimenFiscal: f.regimenFiscal || "",
      usoCfdi: f.usoCfdi || "",
      correo: f.correo || x.email || "",
      telefono: f.telefono || "",
      extranjero: Number(f.esExtranjero) === 1 ? "Sí" : "No",
      residenciaFiscal: f.residenciaFiscal || "",
      registroTributario: f.numRegIdTrib || "",
      direccion: [x.calle, x.numeroExterior, x.numeroInterior]
        .filter(Boolean)
        .join(" "),
      colonia: x.colonia || "",
      poblacion: x.poblacion || "",
    };
    suggestions.clientes.splice(0);
  }
  function selectSeller(x) {
    form.vendedorId = x.id;
    form.vendedorTexto = x.nombre;
    suggestions.vendedores.splice(0);
  }
  function addProduct(x) {
    const found = form.conceptos.find((p) => p.productoId === x.id);
    if (found) found.cantidad += 1;
    else
      form.conceptos.push({
        productoId: x.id,
        codigo: x.codigo,
        descripcion: x.descripcion,
        existencia: Number(x.existencia),
        precio: Number(x.precio),
        cantidad: 1,
        descuento: 0,
        imagenes: Array.isArray(x.imagenes) ? x.imagenes : [],
      });
    searchProduct.value = "";
    suggestions.productos.splice(0);
  }
  async function save() {
    if (
      !form.clienteId ||
      !form.vendedorId ||
      !form.almacen.trim() ||
      !form.conceptos.length
    )
      throw new Error(
        "Selecciona cliente, vendedor, almacén y al menos un producto",
      );
    const invalid = form.conceptos.find(
      (x) =>
        x.cantidad < 1 ||
        x.cantidad > x.existencia ||
        x.descuento < 0 ||
        x.descuento > 100,
    );
    if (invalid)
      throw new Error(`Cantidad o descuento inválido para ${invalid.codigo}`);
    saving.value = true;
    try {
      const payload = {
        folioEspecial: form.folioEspecial || undefined,
        clienteId: form.clienteId,
        vendedorId: form.vendedorId,
        metodoPago: form.metodoPago || undefined,
        credito: Boolean(form.credito),
        almacen: form.almacen,
        fechaVigencia: form.fechaVigencia || undefined,
        fechaEntrega: form.fechaEntrega || undefined,
        observaciones: form.observaciones || undefined,
        conceptos: form.conceptos.map((x) => ({
          productoId: x.productoId,
          cantidad: Number(x.cantidad),
          descuento: Number(x.descuento),
        })),
      };
      const response = editingId.value
        ? await editarCotizacion(editingId.value, payload)
        : await crearCotizacion(payload);
      visible.value = false;
      await onSaved?.();
      return response.data;
    } finally {
      saving.value = false;
    }
  }
  return {
    visible,
    saving,
    editingId,
    form,
    suggestions,
    searchProduct,
    subtotal,
    descuento,
    iva,
    total,
    open,
    findProducts,
    findClients,
    findSellers,
    selectClient,
    selectSeller,
    addProduct,
    save,
  };
}
