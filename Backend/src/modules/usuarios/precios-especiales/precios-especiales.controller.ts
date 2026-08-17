import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { UserRole } from '../../auth/auth.types';
import {
  CreatePrecioEspecialDto,
  FilterPreciosEspecialesDto,
  ProductosDisponiblesDto,
  UpdatePrecioEspecialDto,
} from './dto/precio-especial.dto';
import { PreciosEspecialesService } from './precios-especiales.service';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { RequirePermissions } from '../../auth/permissions.decorator';

@Controller('usuarios/:usuarioId/precios-especiales')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PreciosEspecialesController {
  constructor(private readonly service: PreciosEspecialesService) {}

  @Get()
  @RequirePermissions('usuarios.detalles')
  findAll(
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Query() query: FilterPreciosEspecialesDto,
  ) {
    return this.service.findAll(usuarioId, query);
  }

  @Get('productos-disponibles')
  @RequirePermissions('usuarios.editar')
  productosDisponibles(
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Query() query: ProductosDisponiblesDto,
  ) {
    return this.service.productosDisponibles(usuarioId, query);
  }

  @Post()
  @RequirePermissions('usuarios.editar')
  create(
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreatePrecioEspecialDto,
  ) {
    return this.service.create(usuarioId, request.user!.sub, dto);
  }

  @Patch(':precioId')
  @RequirePermissions('usuarios.editar')
  update(
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Param('precioId', ParseIntPipe) precioId: number,
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdatePrecioEspecialDto,
  ) {
    return this.service.update(usuarioId, precioId, request.user!.sub, dto);
  }
}
