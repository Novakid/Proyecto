import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Producto } from './entities/producto.entity';
import { ProductosService } from './productos.service';
import { ProductosController } from './productos.controller';
import { ProductoImagen } from './entities/ProductoImagen.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Producto, ProductoImagen])],
  controllers: [ProductosController],
  providers: [ProductosService],
})
export class ProductosModule {}