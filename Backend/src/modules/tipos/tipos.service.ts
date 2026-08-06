import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateTipoDto, FilterTipoDto } from './dto/create-tipo.dto';
import { Tipo } from './entities/tipo.entity';
import { TipoImagen } from './entities/tipo-imagen.entity';
import { UpdateTipoDto } from './dto/update-tipo.dto';
import { cleanupUploadedFiles, getStoredUploadPath, removeFileIfExists } from '../../common/uploads/upload-paths';

@Injectable()
export class TiposService {
    constructor(
        @InjectRepository(Tipo)
        private readonly tipoRepo: Repository<Tipo>,
        @InjectRepository(TipoImagen)
        private readonly imagenRepo: Repository<TipoImagen>,
        private readonly dataSource: DataSource,
    ) {}
    async create(dto: CreateTipoDto, files: Express.Multer.File[]) {
        try {
            return await this.dataSource.transaction(async (manager) => {
                const tipoRepo = manager.getRepository(Tipo);
                const imagenRepo = manager.getRepository(TipoImagen);
                const savedTipo = await tipoRepo.save(tipoRepo.create(dto));
                if (files?.length) {
                    await imagenRepo.save(files.map((file) => imagenRepo.create({
                        url: `/uploads/tipos/${file.filename}`,
                        tipo: savedTipo,
                    })));
                }
                return tipoRepo.findOneOrFail({ where: { id: savedTipo.id }, relations: ['imagenes'] });
            });
        } catch (error) {
            cleanupUploadedFiles(files);
            throw error;
        }
    }
    async findAll(params: { page?: number; limit?: number; filters?: FilterTipoDto }) {
        const { page = 1, limit = 8, filters } = params;
        const { nombre, tipoId } = filters || {};
        const query = this.tipoRepo
            .createQueryBuilder('tipo')
            .leftJoinAndSelect('tipo.imagenes', 'imagenes');
        if (nombre) {
            query.andWhere('tipo.nombre LIKE :nombre', {
            nombre: `%${nombre}%`,
            });
        }
        if (tipoId) {
            query.andWhere('tipo.id = :tipoId', { tipoId });
        }
        const total = await query.clone().getCount();
        const data = await query
            .skip((page - 1) * limit)
            .take(limit)
            .getMany();
        return {
            data,
            total,
            page,
            lastPage: Math.ceil(total / limit),
        };
    }
    async findOne(id: number) {
        const tipo = await this.tipoRepo.findOne({
            where: { id },
            relations: ['imagenes'],
        });

        if (!tipo) throw new NotFoundException('Tipo no encontrado');

        return tipo;
    }
    async update(id: number, dto: UpdateTipoDto, files: Express.Multer.File[],) {
        let previousImageUrls: string[] = [];
        try {
            await this.dataSource.transaction(async (manager) => {
                const tipoRepo = manager.getRepository(Tipo);
                const imagenRepo = manager.getRepository(TipoImagen);
                const tipo = await tipoRepo.findOne({ where: { id }, relations: ['imagenes'] });
                if (!tipo) throw new NotFoundException('Tipo no encontrado');
                Object.assign(tipo, dto);
                await tipoRepo.save(tipo);
                if (files?.length) {
                    previousImageUrls = tipo.imagenes.map((imagen) => imagen.url);
                    if (tipo.imagenes.length) await imagenRepo.remove(tipo.imagenes);
                    await imagenRepo.save(files.map((file) => imagenRepo.create({
                        url: `/uploads/tipos/${file.filename}`,
                        tipo,
                    })));
                }
            });
        } catch (error) {
            cleanupUploadedFiles(files);
            throw error;
        }
        for (const url of previousImageUrls) removeFileIfExists(getStoredUploadPath(url));
        return this.findOne(id);
    }
    async remove(id: number) {
        const tipo = await this.findOne(id);
        for (const img of tipo.imagenes) {
            removeFileIfExists(getStoredUploadPath(img.url));
        }
        await this.imagenRepo.delete({ tipo: { id } });
        return this.tipoRepo.remove(tipo);
    }
}
