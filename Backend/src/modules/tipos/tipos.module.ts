import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TiposService } from './tipos.service';
import { TiposController } from './tipos.controller';
import { Tipo } from './entities/tipo.entity';
import { TipoImagen } from './entities/tipo-imagen.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tipo, TipoImagen])],
  controllers: [TiposController],
  providers: [TiposService],
})
export class TiposModule {}