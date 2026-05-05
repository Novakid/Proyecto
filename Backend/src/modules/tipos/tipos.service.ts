import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTipoDto, FilterTipoDto } from './dto/create-tipo.dto';
import { Tipo } from './entities/tipo.entity';
import { TipoImagen } from './entities/tipo-imagen.entity';
import { UpdateTipoDto } from './dto/update-tipo.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TiposService {
    constructor(
        @InjectRepository(Tipo)
        private readonly tipoRepo: Repository<Tipo>,
        @InjectRepository(TipoImagen)
        private readonly imagenRepo: Repository<TipoImagen>,
    ) {}
    async create(dto: CreateTipoDto, files: Express.Multer.File[]) {
        const tipo = this.tipoRepo.create(dto);
        const savedTipo = await this.tipoRepo.save(tipo);
        if (files?.length) {
            const imagenes = files.map(file =>
            this.imagenRepo.create({
                url: `/uploads/tipos/${file.filename}`,
                tipo: savedTipo,
            }),
            );
            await this.imagenRepo.save(imagenes);
        }
        return savedTipo;
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
        const tipo = await this.findOne(id);
        Object.assign(tipo, dto);
        if (files && files.length > 0) {
            await this.imagenRepo.delete({ tipo: { id } });
            const nuevasImagenes = files.map(file =>
            this.imagenRepo.create({
                url: `/uploads/tipos/${file.filename}`,
                tipo,
            }),
        );
        tipo.imagenes = nuevasImagenes;
    }
    return this.tipoRepo.save(tipo);
    }
    async remove(id: number) {
        const tipo = await this.findOne(id);
        for (const img of tipo.imagenes) {
            const filePath = path.join(process.cwd(), img.url);
            if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            }
        }
        await this.imagenRepo.delete({ tipo: { id } });
        return this.tipoRepo.remove(tipo);
    }
}