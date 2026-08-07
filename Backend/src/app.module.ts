import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { databaseConfig } from './config/database.config';
import { ProductosModule } from './modules/productos/productos.module';
import { PedidosModule } from './modules/pedidos/pedidos.module';
import { FacturacionModule } from './modules/facturacion/facturacion.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { UsuarioModule } from './modules/usuarios/usuario.module';
import { TiposModule } from './modules/tipos/tipos.module';
import { AuthModule } from './modules/auth/auth.module';
import { getUploadRoot } from './common/uploads/upload-paths';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: getUploadRoot(),
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
    FacturacionModule,
    UsuarioModule
    ,AuthModule,
    DashboardModule
  ],
})
export class AppModule {}
