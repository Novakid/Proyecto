import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { Producto } from '../productos/entities/producto.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { NotaPago } from '../facturacion/entities/nota-pago.entity';
import { HistorialCompra } from '../facturacion/entities/historial-compra.entity';
import { Cotizacion } from './entities/cotizacion.entity';
import { CotizacionDetalle } from './entities/cotizacion-detalle.entity';
import { CotizacionesController } from './cotizaciones.controller';
import { CotizacionesService } from './cotizaciones.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cotizacion,
      CotizacionDetalle,
      Producto,
      Usuario,
      NotaPago,
      HistorialCompra,
    ]),
    AuthModule,
    DashboardModule,
  ],
  controllers: [CotizacionesController],
  providers: [CotizacionesService],
})
export class CotizacionesModule {}
