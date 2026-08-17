import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Param,
  Patch,
  Delete,
  ParseIntPipe,
  UseInterceptors,
  UploadedFiles
  ,UseGuards, Req
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import { join } from 'path';
import { ProductosService } from './productos.service';
import { CreateProductoDto, FindProductosDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { imageUploadOptions, validateUploadedImages } from '../../common/uploads/image-upload.config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/auth.types';
import { UploadedFilesCleanupInterceptor } from '../../common/uploads/uploaded-files-cleanup.interceptor';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { AgregarStockDto } from './dto/agregar-stock.dto';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
const uploadPath = join(process.cwd(), 'uploads', 'productos');

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}
@Controller('productos')
export class ProductosController {
  constructor(private readonly service: ProductosService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('catalogo.crear')
  @UseInterceptors(
    FilesInterceptor('imagenes', 10, imageUploadOptions('productos')),
    UploadedFilesCleanupInterceptor,
  )
  create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: CreateProductoDto
  ) {
    return this.service.create(body, validateUploadedImages(files));
  }

  @Get()
  findAll(@Query() query: FindProductosDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('catalogo.editar')
  @UseInterceptors(
    FilesInterceptor('imagenes', 10, imageUploadOptions('productos')),
    UploadedFilesCleanupInterceptor,
  )
  update(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UpdateProductoDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.update(id, dto, validateUploadedImages(files), request.user!.permissions?.includes('catalogo.agregar_stock') ?? false);
  }

  @Post(':id/agregar-stock')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('catalogo.agregar_stock')
  agregarStock(@Param('id', ParseIntPipe) id: number, @Body() dto: AgregarStockDto) {
    return this.service.agregarStock(id, dto.cantidad);
  }

  @Post(':id/reactivar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('catalogo.eliminar')
  reactivar(@Param('id', ParseIntPipe) id: number) {
    return this.service.reactivar(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('catalogo.eliminar')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
