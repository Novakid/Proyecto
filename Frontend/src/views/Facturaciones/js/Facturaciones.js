import { ref, computed, toRaw } from "vue";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useProductos } from "../../../services/productos/useProductos";
import { useFacturas } from "../../../services/facturacion/useFacturas";
import { useUsuarios } from "../../../services/usuarios/useUsuarios";
const { usuariosFiltrados, obtenerUsuarios } = useUsuarios();
const { productos, cargarProductos, filtrar } = useProductos();
const { facturas ,crear, cargarFacturas } = useFacturas();
const busqueda = ref('');
const mostrarSugerencias = ref(false);
const cargandoUsuarios = ref(false);
const productoSeleccionado = ref(null);
const form = ref({
    folio: '',
    fecha: '',
    vendedor: '',
    almacen: '',
    cliente: {
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
export function useFacturasForm () {
    const buscarVendedores = async () => {
        if (form.value.vendedor.length < 3) {
            usuariosFiltrados.value = [];
            mostrarSugerencias.value = false;
            return;
        }
        cargandoUsuarios.value = true;
        await obtenerUsuarios({
            nombre: form.value.vendedor,
            page: 1,
            limit: 10
        });
        cargandoUsuarios.value = false;
        mostrarSugerencias.value = true;
    };
    const seleccionarVendedor = (usuario) => {
        form.value.vendedor = usuario.Nombre;
        mostrarSugerencias.value = false;
    };
    const formatearFecha = (fecha) => {
        return new Date(fecha).toLocaleDateString()
    }
    const abrirModal = async () => {
        await cargarProductos();
    };
    const productosFiltrados = computed(() => {
        if (!busqueda.value) return productos.value;
        return productos.value.filter(p =>
            p.codigo.toLowerCase().includes(busqueda.value.toLowerCase())
        );
    });
    const agregarProducto = () => {
        const existe = productosFactura.value.find(p => p.id === productoSeleccionado.value);
        if (existe) {
            existe.cantidad++;
            return;
        }
        const producto = productos.value.find(p => p.id === productoSeleccionado.value);
        if (!producto) return;
        productosFactura.value.push({
            ...producto,
            cantidad: 1,
            descuento: 0
        });
    };
    const subtotalBruto = computed(() => {
        return productosFactura.value.reduce((acc, item) => {
            return acc + (item.precio * item.cantidad);
        }, 0);
    });
    const descuentoTotal = computed(() => {
        return productosFactura.value.reduce((acc, item) => {
            const total = item.precio * item.cantidad;
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
        const conceptos = productosFactura.value.map(item => {
            const subtotal = item.precio * item.cantidad;
            const descuento = Number(item.descuento);
            const total = subtotal - (subtotal * (descuento / 100));
            return {
                producto_id: item.id,
                cantidad: item.cantidad,
                precio_unitario: item.precio,
                subtotal,
                descuento,
                total
            };
        });
        const factura = {
            folio: form.value.folio,
            fecha: form.value.fecha,
            vendedor: form.value.vendedor,
            almacen: form.value.almacen,
            cliente: { ...form.value.cliente },
            conceptos,
            totales: {
            subtotal: subtotalBruto.value,
            descuento: descuentoTotal.value,
            iva: iva.value,
            total: total.value
            }
        };
        await crear(factura);
        return factura;
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
        doc.setFillColor(245,245,245)
        doc.roundedRect(10,35,190,32,2,2,"F")
        doc.setTextColor(55)
        doc.setFontSize(11)
        doc.text("DATOS DEL CLIENTE",14,42)
        doc.setFontSize(9)
        doc.text(`Cliente: ${factura.razon_social}`,14,50)
        doc.text(`RFC: ${factura.rfc}`,14,56)
        doc.text(`DirecciÃƒÂ³n: ${factura.direccion}`,90,50)
        doc.text(`Ciudad: ${factura.poblacion}`,90,56)
        const body = factura.conceptos.map((c) => [
            c.id_catalogo,
            c.cantidad,
            `$${c.precio_unitario.toFixed(2)}`,
            `$${c.monto_sin_iva.toFixed(2)}`,
            `$${c.monto_iva.toFixed(2)}`,
            `$${c.monto_total.toFixed(2)}`,
        ]);
        autoTable(doc,{
            startY:75,
            head:[[
                "CÃƒÂ³digo",
                "Cantidad",
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
        const y = doc.lastAutoTable.finalY + 8

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
        doc.output('dataurlnewwindow')
    };
    const construirEtiquetas = (factura) => {
        const etiquetas = [];
        factura.conceptos.forEach(item => {
            for (let i = 0; i < item.cantidad; i++) {
            etiquetas.push({
                numero: `Producto: ${i + 1}`,
                codigo: `COD-${item.id_catalogo}`,
                nombre: `Producto ${item.id_catalogo}`,
                precio: item.precio_unitario
            });
            }
        });
        return etiquetas;
    };
    const previewEtiquetas = async (factura) => {
        const etiquetas = construirEtiquetas(factura);
        try {
            if (!window.electronAPI?.previewEtiquetas) {
                console.warn('La previsualizacion de etiquetas solo esta disponible en Electron');
                return;
            }
            const buffer = await window.electronAPI.previewEtiquetas(etiquetas);
            if (!buffer) {
            console.error("PDF vacio");
            return;
            }
            const blob = new Blob([buffer], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            window.open(url);
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
    }
}
