import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TiposService } from './tipos.service';
import { TiposController } from './tipos.controller';
import { Tipo } from './entities/tipo.entity';
import { TipoImagen } from './entities/tipo-imagen.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Tipo, TipoImagen]), AuthModule],
  controllers: [TiposController],
  providers: [TiposService],
})
export class TiposModule {}
