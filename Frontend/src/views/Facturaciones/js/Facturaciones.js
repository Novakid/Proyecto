import { ref, computed } from "vue";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useProductos } from "../../../services/productos/useProductos";
import { useFacturas } from "../../../services/facturacion/useFacturas";
import { useUsuarios } from "../../../services/usuarios/useUsuarios";
import { buscarClientesFactura, buscarVendedoresFactura, obtenerPrecioFactura } from '../../../services/facturacion';
import { getApiAssetUrl } from '../../../services/api';
const { usuariosFiltrados, obtenerUsuarios } = useUsuarios();
const { productos, cargarProductos, filtrar } = useProductos();
const { guardar, cargarFacturas } = useFacturas();
const busqueda = ref('');
const mostrarSugerencias = ref(false);
const cargandoUsuarios = ref(false);
const clientesFiltrados = ref([]);
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
        if (form.value.cliente.nombre.length < 3) { clientesFiltrados.value = []; return; }
        clientesFiltrados.value = (await buscarClientesFactura(form.value.cliente.nombre)).data;
    };
    const seleccionarCliente = async (usuario) => {
        form.value.cliente.id = usuario.id;
        form.value.cliente.nombre = usuario.Nombre || '';
        form.value.cliente.rfc = usuario.rfc || '';
        form.value.cliente.direccion = [usuario.Calle, usuario.num_exterior, usuario.num_interior].filter(Boolean).join(' ');
        form.value.cliente.colonia = usuario.colonia || '';
        form.value.cliente.poblacion = usuario.poblacion || '';
        clientesFiltrados.value = [];
        await Promise.all(productosFactura.value.map(async item => {
            item.precioEditable = Number((await obtenerPrecioFactura(usuario.id, item.id)).data.precio);
        }));
    };
    const seleccionarVendedor = (usuario) => {
        form.value.vendedor = usuario.Nombre;
        mostrarSugerencias.value = false;
    };
    const formatearFecha = (fecha) => {
        return new Date(fecha).toLocaleDateString()
    }
    const abrirModal = async () => {
        editingId.value = null;
        form.value.folioCliente = '';
        form.value.folioEspecial = '';
        productosFactura.value = [];
        mensajeFactura.value = '';
        await cargarProductos({ limit: 100, page: 1 });
    };
    const productosFiltrados = computed(() => {
        const activos = productos.value.filter(p => p.activo === true || Number(p.activo) === 1);
        if (!busqueda.value) return activos;
        const search = busqueda.value.toLowerCase();
        return activos.filter(p => String(p.codigo || '').toLowerCase().includes(search) || String(p.descripcion || '').toLowerCase().includes(search));
    });
    const agregarProducto = () => {
        const existe = productosFactura.value.find(p => p.id === productoSeleccionado.value);
        if (existe) {
            mensajeFactura.value = 'El producto ya fue agregado';
            return;
        }
        const producto = productos.value.find(p => p.id === productoSeleccionado.value);
        if (!producto) return;
        if (Number(producto.existencia) <= 0) { mensajeFactura.value = 'No hay en stock'; return; }
        mensajeFactura.value = '';
        imagenProducto.value = obtenerImagenProducto(producto) || '';
        productosFactura.value.push({
            ...producto,
            precioOriginal: Number(producto.precio),
            precioEditable: Number(producto.precio),
            cantidad: 1,
            descuento: 0
        });
        if (form.value.cliente.id) obtenerPrecioFactura(form.value.cliente.id, producto.id)
            .then(({ data }) => { productosFactura.value.at(-1).precioEditable = Number(data.precio); });
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
        await cargarProductos({ limit: 100, page: 1 });
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
        doc.text(`Cliente: ${factura.razon_social}`,14,50)
        doc.text(`RFC: ${factura.rfc}`,14,56)
        doc.text(`Dirección: ${factura.direccion || ''}`,90,50)
        doc.text(`Ciudad: ${factura.poblacion}`,90,56)
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
        if (y > 245) { doc.addPage(); y = 20; }

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
        busqueda,
        productoSeleccionado,
        form,
        abrirModal,
        productosFiltrados,
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
        ,buscarClientes, seleccionarCliente, clientesFiltrados, vendedoresFiltrados, mensajeFactura, imagenProducto
        ,editingId, cargarEdicion, obtenerImagenProducto
    }
}
