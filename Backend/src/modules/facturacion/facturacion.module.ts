import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FacturasService } from './facturacion.service';
import { FacturasController } from './facturacion.controller';
import { NotaPago } from './entities/nota-pago.entity';
import { HistorialCompra } from './entities/historial-compra.entity';
import { AuthModule } from '../auth/auth.module';
import { Producto } from '../productos/entities/producto.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotaPago, HistorialCompra, Producto]),
    AuthModule
  ],
  controllers: [FacturasController],
  providers: [FacturasService],
})
export class FacturacionModule {}
