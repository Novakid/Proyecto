import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Patch,
  Delete,
  ParseIntPipe,
  UseInterceptors,
  UploadedFiles,
  UseGuards,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { TiposService } from './tipos.service';
import { CreateTipoDto, FilterTipoDto } from './dto/create-tipo.dto';
import { UpdateTipoDto } from './dto/update-tipo.dto';
import { imageUploadOptions, validateUploadedImages } from '../../common/uploads/image-upload.config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/auth.types';
import { UploadedFilesCleanupInterceptor } from '../../common/uploads/uploaded-files-cleanup.interceptor';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

@Controller('tipos')
export class TiposController {
    constructor(private readonly service: TiposService) {}

    @Post()
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermissions('catalogo.crear')
    @UseInterceptors(
    FilesInterceptor('imagenes', 10, imageUploadOptions('tipos')),
    UploadedFilesCleanupInterceptor,
    )
    create(
    @Body() body: CreateTipoDto,
    @UploadedFiles() files: Express.Multer.File[],
    ) {
    return this.service.create(body, validateUploadedImages(files));
    }
    @Get()
    findAll(@Query() query: FilterTipoDto) {
        return this.service.findAll({ page: query.page, limit: query.limit, filters: query });
    }
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.service.findOne(id);
    }
    @Patch(':id')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermissions('catalogo.editar')
    @UseInterceptors(
    FilesInterceptor('imagenes', 10, imageUploadOptions('tipos')),
    UploadedFilesCleanupInterceptor,
    )
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateTipoDto,
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        return this.service.update(id, dto, validateUploadedImages(files));
    }
    @Delete(':id')
        @UseGuards(JwtAuthGuard, PermissionsGuard)
        @RequirePermissions('catalogo.eliminar')
        remove(@Param('id', ParseIntPipe) id: number) {
        return this.service.remove(id);
    }
}
