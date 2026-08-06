import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Usuario } from './entities/usuario.entity';
import { UsuarioController } from './usuario.controller';
import { UsuarioService } from './usuario.service';
import { AuthModule } from '../auth/auth.module';
import { Producto } from '../productos/entities/producto.entity';
import { ClientePrecioEspecial } from './precios-especiales/entities/cliente-precio-especial.entity';
import { PreciosEspecialesController } from './precios-especiales/precios-especiales.controller';
import { PreciosEspecialesService } from './precios-especiales/precios-especiales.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario, Producto, ClientePrecioEspecial]),
    AuthModule,
  ],
  controllers: [UsuarioController, PreciosEspecialesController],
  providers: [UsuarioService, PreciosEspecialesService],
  exports: [UsuarioService, PreciosEspecialesService],
})
export class UsuarioModule {}
