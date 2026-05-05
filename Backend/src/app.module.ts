import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { databaseConfig } from './config/database.config';
import { ProductosModule } from './modules/productos/productos.module';
import { PedidosModule } from './modules/pedidos/pedidos.module';
import { FacturacionModule } from './modules/facturacion/facturacion.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { TiposModule } from './modules/tipos/tipos.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: databaseConfig,
    }),
    TiposModule,
    ProductosModule,
    PedidosModule,
    FacturacionModule],
})
export class AppModule {}
