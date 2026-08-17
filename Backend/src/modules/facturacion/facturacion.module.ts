import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FacturasService } from './facturacion.service';
import { FacturasController } from './facturacion.controller';
import { NotaPago } from './entities/nota-pago.entity';
import { HistorialCompra } from './entities/historial-compra.entity';
import { AuthModule } from '../auth/auth.module';
import { Producto } from '../productos/entities/producto.entity';
import { DashboardModule } from '../dashboard/dashboard.module';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { ClienteDatos } from '../usuarios/entities/cliente-datos.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotaPago,
      HistorialCompra,
      Producto,
      Usuario,
      ClienteDatos,
    ]),
    AuthModule,
    DashboardModule,
  ],
  controllers: [FacturasController],
  providers: [FacturasService],
})
export class FacturacionModule {}
