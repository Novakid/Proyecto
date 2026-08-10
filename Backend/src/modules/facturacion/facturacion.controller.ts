import { Controller, Post, Body, Get, Query, UseGuards, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { FacturasService } from './facturacion.service';
import { CreateFacturaDto, FilterFacturasDto } from './dto/create-factura.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/auth.types';

@Controller('facturas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
export class FacturasController {
  constructor(private readonly service: FacturasService) {}

  @Post()
  create(@Body() dto: CreateFacturaDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() filters: FilterFacturasDto) {
    return this.service.findAll(filters);
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
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateFacturaDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/cancelar')
  cancel(@Param('id', ParseIntPipe) id: number) { return this.service.cancel(id); }

  @Post(':id/simular-timbrado-qa')
  simularTimbradoQa(@Param('id', ParseIntPipe) id: number) {
    return this.service.simularTimbradoQa(id);
  }
}
