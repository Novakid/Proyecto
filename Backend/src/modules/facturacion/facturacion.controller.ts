import { Controller, Post, Body, Get, Query, UseGuards, Param, ParseIntPipe, Patch, Req } from '@nestjs/common';
import { FacturasService } from './facturacion.service';
import { CreateFacturaDto, FilterFacturasDto } from './dto/create-factura.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/auth.types';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';

@Controller('facturas')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('facturacion.ver')
export class FacturasController {
  constructor(private readonly service: FacturasService) {}

  @Post()
  @RequirePermissions('facturacion.crear')
  create(@Body() dto: CreateFacturaDto, @Req() req: AuthenticatedRequest) {
    return this.service.create(dto, req.user!.sub);
  }

  @Get()
  findAll(@Query() filters: FilterFacturasDto, @Req() req: AuthenticatedRequest) {
    return this.service.findAll(filters, req.user!.sub, req.user!.permissions?.includes('facturacion.ver_todas') ?? false);
  }

  @Get('catalogos/vendedores')
  vendedores(@Query('search') search = '') { return this.service.buscarVendedores(search); }

  @Get('catalogos/clientes')
  clientes(@Query('search') search = '') { return this.service.buscarClientes(search); }

  @Get('catalogos/precio')
  precio(@Query('clienteId') clienteId: string, @Query('productoId') productoId: string) {
    return this.service.precioEfectivo(Number(clienteId || 0), Number(productoId));
  }

  @Get(':id')
  @RequirePermissions('facturacion.detalles')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) { return this.service.findOne(id, req.user!.sub, req.user!.permissions?.includes('facturacion.ver_todas') ?? false); }

  @Patch(':id')
  @RequirePermissions('facturacion.editar')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateFacturaDto, @Req() req: AuthenticatedRequest) {
    return this.service.update(id, dto, req.user!.sub, req.user!.permissions?.includes('facturacion.ver_todas') ?? false);
  }

  @Post(':id/cancelar')
  @RequirePermissions('facturacion.cancelar')
  cancel(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) { return this.service.cancel(id, req.user!.sub, req.user!.permissions?.includes('facturacion.ver_todas') ?? false); }

  @Post(':id/simular-timbrado-qa')
  @RequirePermissions('facturacion.timbrar')
  simularTimbradoQa(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.service.simularTimbradoQa(id, req.user!.sub, req.user!.permissions?.includes('facturacion.ver_todas') ?? false);
  }
}
