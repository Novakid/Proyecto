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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CotizacionesService } from './cotizaciones.service';
import {
  FilterCotizacionesDto,
  SaveCotizacionDto,
  SearchCotizacionDto,
} from './dto/cotizacion.dto';

@Controller('cotizaciones')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('cotizaciones.ver')
export class CotizacionesController {
  constructor(private readonly service: CotizacionesService) {}
  @Post() @RequirePermissions('cotizaciones.crear') create(
    @Body() dto: SaveCotizacionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.create(dto, req.user!.sub);
  }
  @Get() findAll(@Query() dto: FilterCotizacionesDto) {
    return this.service.findAll(dto);
  }
  @Get('catalogos/productos') products(@Query() dto: SearchCotizacionDto) {
    return this.service.searchProducts(dto.search, dto.limit);
  }
  @Get('catalogos/clientes') clients(@Query() dto: SearchCotizacionDto) {
    return this.service.searchClients(dto.search, dto.limit);
  }
  @Get('catalogos/vendedores') sellers(@Query() dto: SearchCotizacionDto) {
    return this.service.searchSellers(dto.search, dto.limit);
  }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
  @Patch(':id') @RequirePermissions('cotizaciones.editar') update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveCotizacionDto,
  ) {
    return this.service.update(id, dto);
  }
  @Post(':id/generar-factura')
  @RequirePermissions('cotizaciones.generar_factura')
  transfer(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.generateInvoice(id, req.user!.sub);
  }
  @Post(':id/cancelar') @RequirePermissions('cotizaciones.cancelar') cancel(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.cancel(id);
  }
  @Post(':id/reactivar')
  @RequirePermissions('cotizaciones.reactivar')
  reactivate(@Param('id', ParseIntPipe) id: number) {
    return this.service.reactivate(id);
  }
}
