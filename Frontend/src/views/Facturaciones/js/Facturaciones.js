import { ref, computed } from "vue";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useFacturas } from "../../../services/facturacion/useFacturas";
import { useUsuarios } from "../../../services/usuarios/useUsuarios";
import { buscarClientesFactura, buscarProductosFactura, buscarVendedoresFactura, obtenerPrecioFactura } from '../../../services/facturacion';
import { getApiAssetUrl } from '../../../services/api';
const { usuariosFiltrados, obtenerUsuarios } = useUsuarios();
const { guardar, cargarFacturas } = useFacturas();
const busqueda = ref('');
const productosEncontrados = ref([]);
const buscandoProductos = ref(false);
const indiceProductoActivo = ref(-1);
let temporizadorProductos;
let solicitudProductos;
const mostrarSugerencias = ref(false);
const cargandoUsuarios = ref(false);
const clientesFiltrados = ref([]);
const cargandoCliente = ref(false);
const errorFiscalCliente = ref('');
const datosFiscalesCliente = ref(null);
let solicitudCliente = 0;
const vendedoresFiltrados = ref([]);
const mensajeFactura = ref('');
const imagenProducto = ref('');
const productoSeleccionado = ref(null);
const form = ref({
    folioCliente: '',
    folioEspecial: '',
    fecha: '',
    vendedor: '',
    almacen: '',
    cliente: {
        id: null,
        nombre: '',
        rfc: '',
        direccion: '',
        colonia: '',
        poblacion: '',
        fechaEntrega: '',
        operador: '',
        credito: false
    }
});
const productosFactura = ref([]);
const editingId = ref(null);
export function useFacturasForm () {
    const obtenerImagenProducto = (producto) => {
        const primeraImagen = producto?.imagenes?.find(imagen => typeof imagen?.url === 'string' && imagen.url.trim());
        return primeraImagen ? getApiAssetUrl(primeraImagen.url) : null;
    };
    const buscarVendedores = async () => {
        if (form.value.vendedor.length < 3) {
            usuariosFiltrados.value = [];
            mostrarSugerencias.value = false;
            return;
        }
        cargandoUsuarios.value = true;
        vendedoresFiltrados.value = (await buscarVendedoresFactura(form.value.vendedor)).data;
        cargandoUsuarios.value = false;
        mostrarSugerencias.value = true;
    };
    const buscarClientes = async () => {
        if (form.value.cliente.nombre.length < 3) {
            clientesFiltrados.value = [];
            return;
        }
        clientesFiltrados.value = (await buscarClientesFactura(form.value.cliente.nombre)).data;
    };
    const seleccionarClientePorNombre = () => {
        const match = clientesFiltrados.value.find(usuario => usuario.Nombre === form.value.cliente.nombre);
        if (match) seleccionarCliente(match);
    };
    const seleccionarCliente = async (usuario) => {
        const requestId = ++solicitudCliente;
        cargandoCliente.value = true;
        errorFiscalCliente.value = '';
        datosFiscalesCliente.value = null;
        form.value.cliente.id = usuario.id;
        form.value.cliente.nombre = usuario.Nombre || '';
        const fiscal = usuario.datosFiscales || null;
        if (requestId !== solicitudCliente) return;
        datosFiscalesCliente.value = fiscal;
        form.value.cliente.rfc = fiscal?.rfc || '';
        form.value.cliente.direccion = [usuario.Calle, usuario.num_exterior, usuario.num_interior].filter(Boolean).join(' ');
        form.value.cliente.colonia = usuario.colonia || '';
        form.value.cliente.poblacion = usuario.poblacion || '';
        clientesFiltrados.value = [];
        if (!fiscal) errorFiscalCliente.value = 'Este cliente no tiene datos fiscales. Complétalos antes de crear la factura.';
        try {
            const prices = await Promise.all(productosFactura.value.map(item => obtenerPrecioFactura(usuario.id, item.id)));
            if (requestId !== solicitudCliente) return;
            prices.forEach((response, index) => { productosFactura.value[index].precioEditable = Number(response.data.precio); });
        } finally {
            if (requestId === solicitudCliente) cargandoCliente.value = false;
        }
    };
    const seleccionarVendedor = (usuario) => {
        form.value.vendedor = usuario.Nombre;
        mostrarSugerencias.value = false;
    };
    const formatearFecha = (fecha) => {
        return new Date(fecha).toLocaleDateString()
    }
    const formatearFechaHora = (fecha) => {
        if (!fecha) return '—';
        const value = new Date(fecha);
        if (Number.isNaN(value.getTime())) return 'Fecha inválida';
        return new Intl.DateTimeFormat('es-MX', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
        }).format(value);
    };
    const abrirModal = async () => {
        editingId.value = null;
        form.value.folioCliente = '';
        form.value.folioEspecial = '';
        productosFactura.value = [];
        mensajeFactura.value = '';
        busqueda.value = '';
        productosEncontrados.value = [];
        datosFiscalesCliente.value = null;
        errorFiscalCliente.value = '';
    };
    const buscarProductos = () => {
        clearTimeout(temporizadorProductos);
        solicitudProductos?.abort();
        const term = busqueda.value.trim();
        indiceProductoActivo.value = -1;
        if (!term) {
            productosEncontrados.value = [];
            buscandoProductos.value = false;
            return;
        }
        temporizadorProductos = setTimeout(async () => {
            solicitudProductos = new AbortController();
            buscandoProductos.value = true;
            try {
                const { data } = await buscarProductosFactura(term, solicitudProductos.signal);
                productosEncontrados.value = busqueda.value.trim() === term && Array.isArray(data) ? data : [];
            } catch (error) {
                if (error.code !== 'ERR_CANCELED') mensajeFactura.value = error.response?.data?.message || 'No fue posible buscar productos';
            } finally {
                buscandoProductos.value = false;
            }
        }, 300);
    };
    const agregarProducto = async (producto) => {
        if (!producto || !producto.activo || Number(producto.existencia) <= 0) {
            mensajeFactura.value = 'El producto no está disponible';
            return;
        }
        const existe = productosFactura.value.find(p => p.id === producto.id);
        if (existe) {
            if (existe.cantidad >= Number(existe.existencia)) {
                mensajeFactura.value = `Stock máximo alcanzado para ${existe.codigo}`;
                return;
            }
            existe.cantidad += 1;
            mensajeFactura.value = `${existe.codigo}: cantidad aumentada`;
            busqueda.value = ''; productosEncontrados.value = [];
            return;
        }
        mensajeFactura.value = `${producto.codigo} agregado`;
        imagenProducto.value = obtenerImagenProducto(producto) || '';
        productosFactura.value.push({
            ...producto,
            precioOriginal: Number(producto.precio),
            precioEditable: Number(producto.precio),
            cantidad: 1,
            descuento: 0
        });
        if (form.value.cliente.id) {
            const { data } = await obtenerPrecioFactura(form.value.cliente.id, producto.id);
            const added = productosFactura.value.find(item => item.id === producto.id);
            if (added) added.precioEditable = Number(data.precio);
        }
        busqueda.value = ''; productosEncontrados.value = []; indiceProductoActivo.value = -1;
        setTimeout(() => document.getElementById('buscarProductoFactura')?.focus(), 0);
    };
    const teclaProducto = async (event) => {
        if (event.key === 'Escape') {
            productosEncontrados.value = [];
            return;
        }
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            indiceProductoActivo.value = Math.min(indiceProductoActivo.value + 1, productosEncontrados.value.length - 1);
            return;
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            indiceProductoActivo.value = Math.max(indiceProductoActivo.value - 1, 0);
            return;
        }
        if (event.key !== 'Enter') return;
        event.preventDefault();
        const term = busqueda.value.trim();
        if (!term) return;
        if (!productosEncontrados.value.length) {
            clearTimeout(temporizadorProductos);
            solicitudProductos?.abort();
            solicitudProductos = new AbortController();
            buscandoProductos.value = true;
            try {
                const { data } = await buscarProductosFactura(term, solicitudProductos.signal);
                if (busqueda.value.trim() === term) productosEncontrados.value = Array.isArray(data) ? data : [];
            } catch (error) {
                if (error.code !== 'ERR_CANCELED') mensajeFactura.value = error.response?.data?.message || 'No fue posible buscar productos';
            } finally {
                buscandoProductos.value = false;
            }
        }
        const exact = productosEncontrados.value.find(p => String(p.codigo).trim().toLowerCase() === term.toLowerCase());
        const selected = exact || (indiceProductoActivo.value >= 0 ? productosEncontrados.value[indiceProductoActivo.value] : null);
        if (selected) await agregarProducto(selected);
        else mensajeFactura.value = productosEncontrados.value.length ? 'Selecciona una coincidencia antes de agregar' : 'No se encontró un producto con ese código';
    };
    const cerrarSugerenciasProductos = () => {
        setTimeout(() => { productosEncontrados.value = []; indiceProductoActivo.value = -1; }, 150);
    };
    const subtotalBruto = computed(() => {
        return productosFactura.value.reduce((acc, item) => {
            return acc + (item.precioEditable * item.cantidad);
        }, 0);
    });
    const descuentoTotal = computed(() => {
        return productosFactura.value.reduce((acc, item) => {
            const total = item.precioEditable * item.cantidad;
            return acc + (total * (item.descuento / 100));
        }, 0);
    });
    const subtotal = computed(() => {
        return subtotalBruto.value - descuentoTotal.value;
    });
    const iva = computed(() => subtotal.value * 0.16);
    const total = computed(() => subtotal.value + iva.value);
    const formatoMoneda = (valor) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(valor);
    };
    const construirFactura = async () => {
        if (cargandoCliente.value) throw new Error('Espera a que terminen de cargar los datos fiscales del cliente');
        if (!form.value.cliente.id || !datosFiscalesCliente.value) throw new Error(errorFiscalCliente.value || 'Selecciona un cliente con datos fiscales completos');
        if (!productosFactura.value.length) throw new Error('Agrega al menos un producto');
        const invalido = productosFactura.value.find(item => item.cantidad < 1 || item.cantidad > item.existencia);
        if (invalido) throw new Error(`Cantidad inválida para ${invalido.codigo}. Disponible: ${invalido.existencia}`);
        const conceptos = productosFactura.value.map(item => {
            const subtotal = item.precioEditable * item.cantidad;
            const descuento = Number(item.descuento);
            const total = subtotal - (subtotal * (descuento / 100));
            return {
                producto_id: item.id,
                cantidad: item.cantidad,
                precio_unitario: Number(item.precioEditable),
                subtotal,
                descuento,
                total
            };
        });
        const factura = {
            folioEspecial: form.value.folioEspecial?.trim() || null,
            fecha: form.value.fecha,
            vendedor: form.value.vendedor,
            almacen: form.value.almacen,
            ...(Number.isInteger(Number(form.value.cliente.id)) && Number(form.value.cliente.id) > 0
                ? { clienteId: Number(form.value.cliente.id) }
                : {}),
            cliente: {
                nombre: form.value.cliente.nombre,
                rfc: form.value.cliente.rfc,
                direccion: form.value.cliente.direccion,
                colonia: form.value.cliente.colonia,
                poblacion: form.value.cliente.poblacion,
                fechaEntrega: form.value.cliente.fechaEntrega,
                operador: form.value.cliente.operador,
                credito: Boolean(form.value.cliente.credito)
            },
            conceptos,
            totales: {
            subtotal: subtotalBruto.value,
            descuento: descuentoTotal.value,
            iva: iva.value,
            total: total.value
            }
        };
        const response = await guardar(factura, editingId.value);
        form.value.folioCliente = response.data.folio_cliente;
        form.value.folioEspecial = response.data.folio_especial || '';
        editingId.value = null;
        await cargarFacturas();
        return response.data;
    };
    const cargarEdicion = async (factura) => {
        editingId.value = factura.id;
        form.value = {
            folioCliente: factura.folio_cliente || '', folioEspecial: factura.folio_especial || '',
            fecha: String(factura.fecha_emision || '').slice(0, 10),
            vendedor: factura.vendedor || '', almacen: factura.almacen || '',
            cliente: { id: factura.id_cliente || null, nombre: factura.razon_social || '', rfc: factura.rfc || '',
                direccion: factura.direccion || '', colonia: factura.colonia || '', poblacion: factura.poblacion || '',
                fechaEntrega: String(factura.fecha_entrega || '').slice(0, 10), operador: factura.operador || '',
                credito: Number(factura.credito) === 1 }
        };
        productosFactura.value = (factura.conceptos || []).map(c => ({
            ...(c.producto || {}), id: c.id_catalogo,
            existencia: Number(c.producto?.existencia || 0) + Number(c.cantidad),
            precioOriginal: c.precio_original == null ? Number(c.producto?.precio || c.precio_unitario) : Number(c.precio_original),
            precioEditable: Number(c.precio_unitario), cantidad: Number(c.cantidad),
            descuento: Number(c.precio_unitario) > 0 ? Math.max(0, Math.min(100,
                100 - (Number(c.monto_sin_iva) / (Number(c.precio_unitario) * Number(c.cantidad))) * 100)) : 0,
        }));
        datosFiscalesCliente.value = factura.datosFiscalesSnapshot || null;
    };
    const colores = {
        rojo: [185, 28, 28],
        gris: [55, 65, 81],
        grisClaro: [243,244,246],
        blanco: [255,255,255]
    };
    const generarPDF = (factura) => {
        const doc = new jsPDF()
        doc.setFillColor(55,65,81)
        doc.rect(0,0,210,28,"F")
        doc.setTextColor(255)
        doc.setFontSize(20)
        doc.text("FACTURA",14,16)
        doc.setFontSize(9)
        doc.text("APARIFICIO REFACCIONES S.A. de C.V.",14,22)
        doc.setTextColor(255)
        doc.setFontSize(10)
        doc.text(`Folio: ${factura.folio_cliente}`,150,12)
        doc.text(`Fecha: ${formatearFecha(factura.fecha_emision)}`,150,18)
        if (factura.folio_especial) doc.text(`Folio especial: ${factura.folio_especial}`,150,24)
        doc.setFillColor(245,245,245)
        doc.roundedRect(10,35,190,32,2,2,"F")
        doc.setTextColor(55)
        doc.setFontSize(11)
        doc.text("DATOS DEL CLIENTE",14,42)
        doc.setFontSize(9)
        const fiscal = factura.datosFiscalesSnapshot || {};
        doc.text(`Cliente: ${fiscal.razon_social || factura.razon_social || ''}`,14,50)
        doc.text(`RFC: ${fiscal.rfc || factura.rfc || ''}`,14,56)
        doc.text(`CP fiscal: ${fiscal.codigo_postal || 'N/D'} · Régimen: ${fiscal.regimen_fiscal || 'N/D'}`,90,50)
        doc.text(`Uso CFDI: ${fiscal.uso_cfdi || 'N/D'} · ${fiscal.correo || ''}`,90,56)
        const body = factura.conceptos.map((c) => [
            c.producto?.codigo || c.id_catalogo,
            c.cantidad,
            c.precio_original == null ? 'N/D' : `$${Number(c.precio_original).toFixed(2)}`,
            `$${Number(c.precio_unitario).toFixed(2)}`,
            `$${Number(c.monto_sin_iva).toFixed(2)}`,
            `$${Number(c.monto_iva).toFixed(2)}`,
            `$${Number(c.monto_total).toFixed(2)}`,
        ]);
        autoTable(doc,{
            startY:75,
            head:[[
                "Código",
                "Cantidad",
                "Precio original",
                "Precio",
                "Subtotal",
                "IVA",
                "Total"
            ]],
            body,
            theme:'grid',
            headStyles:{
                fillColor:[185,28,28],
                textColor:255,
                fontStyle:'bold',
                halign:'center'
            },
            bodyStyles:{
                fontSize:9,
                textColor:50
            },
            alternateRowStyles:{
                fillColor:[245,245,245]
            },
            styles:{
                cellPadding:3,
                lineWidth:0.1
            }
        })
        let y = doc.lastAutoTable.finalY + 8
        if (y > 245) {
            doc.addPage();
            y = 20;
        }

        doc.setFillColor(240,240,240)
        doc.roundedRect(125,y,75,34,2,2,"F")

        doc.setFontSize(10)

        doc.text("Subtotal",130,y+8)
        doc.text(formatoMoneda(factura.subtotal),195,y+8,{align:"right"})

        doc.text("Descuento",130,y+15)
        doc.text(formatoMoneda(factura.descuento),195,y+15,{align:"right"})

        doc.text("IVA",130,y+22)
        doc.text(formatoMoneda(factura.total-factura.subtotal+factura.descuento),195,y+22,{align:"right"})
        doc.setFillColor(185,28,28)
        doc.roundedRect(125,y+28,75,10,2,2,"F")

        doc.setTextColor(255)
        doc.setFontSize(12)

        doc.text(`TOTAL ${formatoMoneda(factura.total)}`, 195, y+35, {align:"right"})
        doc.setDrawColor(200)
        doc.line(10,285,200,285)
        doc.setTextColor(120)
        doc.setFontSize(8)
        doc.text("Este documento fue generado por APARICIO REFACCIONES.", 105, 290, {align:"center"})
        doc.text(Number(factura.timbrada) === 1 ? `Estado interno: Timbrada · ${formatearFecha(factura.fecha_timbrado)}` : 'Estado interno: No timbrada', 105, 280, {align:'center'})
        doc.text('Documento sin validez fiscal', 105, 284, {align:'center'})
        // doc.addImage(logoBase64, "PNG", 14, 5, 24, 24)
        // doc.addImage(qrBase64,'PNG',165,245,30,30)
        const url = URL.createObjectURL(doc.output('blob'));
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    };
    const construirEtiquetas = (factura) => {
        const etiquetas = [];
        factura.conceptos.forEach(item => {
            for (let i = 0; i < item.cantidad; i++) {
            etiquetas.push({
                codigo: item.producto?.codigo || String(item.id_catalogo),
                nombre: item.producto?.descripcion || `Producto ${item.id_catalogo}`,
                descripcion: item.producto?.descripcion || '',
                precio: Number(item.precio_unitario).toFixed(2),
                adicional: `Unidad ${i + 1} de ${item.cantidad}`
            });
            }
        });
        return etiquetas;
    };
    const previewEtiquetas = async (factura, configuracion) => {
        const etiquetas = construirEtiquetas(factura);
        try {
            if (!window.electronAPI?.previewEtiquetas) {
                console.warn('La previsualizacion de etiquetas solo esta disponible en Electron');
                return;
            }
            const result = await window.electronAPI.previewEtiquetas({ etiquetas, configuracion });
            if (!result?.pdf) {
            console.error("PDF vacio");
            return;
            }
            const blob = new Blob([result.pdf], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            window.open(url);
            setTimeout(() => URL.revokeObjectURL(url), 60000);
            return result;
        } catch (error) {
            console.error("ERROR", error);
        }
    };
    return {
        formatearFecha,
        formatearFechaHora,
        busqueda,
        productoSeleccionado,
        form,
        abrirModal,
        productosEncontrados, buscandoProductos, indiceProductoActivo, buscarProductos, teclaProducto,
        productosFactura,
        agregarProducto,
        subtotalBruto,
        descuentoTotal,
        subtotal,
        iva,
        total,
        formatoMoneda,
        construirFactura,
        generarPDF,
        construirEtiquetas,
        previewEtiquetas,
        buscarVendedores,
        seleccionarVendedor,
        usuariosFiltrados,
        mostrarSugerencias,
        cargandoUsuarios
        ,buscarClientes, seleccionarCliente, seleccionarClientePorNombre, clientesFiltrados, vendedoresFiltrados, mensajeFactura, imagenProducto
        ,editingId, cargarEdicion, obtenerImagenProducto, cargandoCliente, errorFiscalCliente, datosFiscalesCliente
        ,cerrarSugerenciasProductos
    }
}
