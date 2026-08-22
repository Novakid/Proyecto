import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Producto } from '../modules/productos/entities/producto.entity';
import { ProductoImagen } from '../modules/productos/entities/ProductoImagen.entity';
import { Tipo } from '../modules/tipos/entities/tipo.entity';
import { TipoImagen } from '../modules/tipos/entities/tipo-imagen.entity';
import { Usuario } from '../modules/usuarios/entities/usuario.entity';
import { NotaPago } from '../modules/facturacion/entities/nota-pago.entity';
import { HistorialCompra } from '../modules/facturacion/entities/historial-compra.entity';
import { InitialSchema1700000000000 } from '../migrations/1700000000000-InitialSchema';
import { AddAuthentication1700000001000 } from '../migrations/1700000001000-AddAuthentication';
import { HardenInvoiceMoneyAndDate1785888000000 } from '../migrations/1785888000000-HardenInvoiceMoneyAndDate';
import { ClientePrecioEspecial } from '../modules/usuarios/precios-especiales/entities/cliente-precio-especial.entity';
import { HardenClientePreciosEspeciales1785974400000 } from '../migrations/1785974400000-HardenClientePreciosEspeciales';
import { AddFacturaPrecioOriginal1786147200000 } from '../migrations/1786147200000-AddFacturaPrecioOriginal';
import { Rol } from '../modules/auth/entities/rol.entity';
import { Permiso } from '../modules/auth/entities/permiso.entity';
import { AddRoleBasedPermissions1786233600000 } from '../migrations/1786233600000-AddRoleBasedPermissions';
import { ClienteDatos } from '../modules/usuarios/entities/cliente-datos.entity';
import { CreateOrHardenClientesDatos1786665600000 } from '../migrations/1786665600000-CreateOrHardenClientesDatos';
import { AddCatalogoAgregarStockPermission1786838400000 } from '../migrations/1786838400000-AddCatalogoAgregarStockPermission';
import { AddAutomaticInvoiceFolios1787097600000 } from '../migrations/1787097600000-AddAutomaticInvoiceFolios';
import { AddInvoiceFiscalSnapshotAndStampState1787184000000 } from '../migrations/1787184000000-AddInvoiceFiscalSnapshotAndStampState';
import { Cotizacion } from '../modules/cotizaciones/entities/cotizacion.entity';
import { CotizacionDetalle } from '../modules/cotizaciones/entities/cotizacion-detalle.entity';
import { CompleteCotizacionesModule1787270400000 } from '../migrations/1787270400000-CompleteCotizacionesModule';
import { CompleteCotizacionesRelations1787356800000 } from '../migrations/1787356800000-CompleteCotizacionesRelations';

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  entities: [
    Producto,
    ProductoImagen,
    Tipo,
    TipoImagen,
    Usuario,
    NotaPago,
    HistorialCompra,
    ClientePrecioEspecial,
    Rol,
    Permiso,
    ClienteDatos,
    Cotizacion,
    CotizacionDetalle,
  ],
  migrations: [
    InitialSchema1700000000000,
    AddAuthentication1700000001000,
    HardenInvoiceMoneyAndDate1785888000000,
    HardenClientePreciosEspeciales1785974400000,
    AddFacturaPrecioOriginal1786147200000,
    AddRoleBasedPermissions1786233600000,
    CreateOrHardenClientesDatos1786665600000,
    AddCatalogoAgregarStockPermission1786838400000,
    AddAutomaticInvoiceFolios1787097600000,
    AddInvoiceFiscalSnapshotAndStampState1787184000000,
    CompleteCotizacionesModule1787270400000,
    CompleteCotizacionesRelations1787356800000,
  ],
  synchronize: false,
});
