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
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { TiposService } from './tipos.service';
import { CreateTipoDto, FilterTipoDto } from './dto/create-tipo.dto';
import { UpdateTipoDto } from './dto/update-tipo.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('tipos')
export class TiposController {
    constructor(private readonly service: TiposService) {}

    @Post()
    @UseInterceptors(
    FilesInterceptor('imagenes', 10, {
        storage: diskStorage({
        destination: './uploads/tipos',
        filename: (req, file, cb) => {
            const uniqueName = Date.now() + extname(file.originalname);
            cb(null, uniqueName);
        },
        }),
    }),
    )
    create(
    @Body() body: CreateTipoDto,
    @UploadedFiles() files: Express.Multer.File[],
    ) {
        console.log(files);
    return this.service.create(body, files);
    }
    @Get()
    findAll(@Query() query: any) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 8;
        const filters: FilterTipoDto = {
            nombre: query.nombre,
            tipoId: query.tipoId ? Number(query.tipoId) : undefined,
        };
        return this.service.findAll({ page, limit, filters });
    }
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.service.findOne(id);
    }
    @Patch(':id')
    @UseInterceptors(
    FilesInterceptor('imagenes', 10, {
        storage: diskStorage({
        destination: './uploads/tipos',
        filename: (req, file, cb) => {
            const uniqueName = Date.now() + extname(file.originalname);
            cb(null, uniqueName);
        },
        }),
    }),
    )
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateTipoDto,
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        return this.service.update(id, dto, files);
    }
    @Delete(':id')
        remove(@Param('id', ParseIntPipe) id: number) {
        return this.service.remove(id);
    }
}