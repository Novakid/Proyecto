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
  ,UseGuards
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
const uploadPath = join(process.cwd(), 'uploads', 'productos');

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}
@Controller('productos')
export class ProductosController {
  constructor(private readonly service: ProductosService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  @UseInterceptors(
    FilesInterceptor('imagenes', 10, imageUploadOptions('productos')),
    UploadedFilesCleanupInterceptor,
  )
  update(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UpdateProductoDto,
  ) {
    return this.service.update(id, dto, validateUploadedImages(files));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
