import { ref } from 'vue';
import { 
    getFacturas,
    getFactura,
    createFactura,
    updateFactura,
    deleteFactura
} from '../../services/facturacion';

export function useFacturas() {

    const facturas = ref([]);

    const cargarFacturas = async () => {
        const { data } = await getFacturas();
        facturas.value = data.notas_de_pago || data;
    };
    const crear = async (payload) => {
        await createFactura (payload);
    };
    return {
        facturas,
        cargarFacturas,
        crear
    }
}
