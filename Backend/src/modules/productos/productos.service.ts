import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductoImagen } from './entities/ProductoImagen.entity'
import { Producto } from './entities/producto.entity';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { In } from 'typeorm';
import { Tipo } from '../tipos/entities/tipo.entity';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private readonly repo: Repository<Producto>,
    @InjectRepository(ProductoImagen)
    private readonly imagenRepo: Repository<ProductoImagen>,
    @InjectRepository(Tipo)
    private readonly tipoRepo: Repository<Tipo>,
  ) {}

  async create(data: CreateProductoDto, files: Express.Multer.File[]) {
    // 🔥 1. Buscar tipos
    const tipos = await this.tipoRepo.findBy({
      id: In(data.tipos),
    });
    // 🔥 2. Crear producto SIN tipos primero
    const producto = this.repo.create({
      ...data,
      tipos,
    });
    const productoGuardado = await this.repo.save(producto);
    // 🔥 3. Imágenes (igual que ya lo tienes)
    const imagenes = files.map(file => {
      return this.imagenRepo.create({
        url: file.filename,
        producto: productoGuardado,
      });
    });
    await this.imagenRepo.save(imagenes);
    return productoGuardado;
  }

  async findAll() {
    return await this.repo.find({
      relations: ['imagenes'],
      order: { id: 'DESC' },
    });
  }

  async findOne(id: number) {
    const producto = await this.repo.findOne({
      where: { id },
      relations: ['imagenes'],
    });

    if (!producto) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    return producto;
  }

  async update(id: number, data: UpdateProductoDto) {
    const producto = await this.findOne(id);

    if (data.tipos) {
      const tipos = await this.tipoRepo.findBy({
        id: In(data.tipos),
      });

      producto.tipos = tipos;
    }

    Object.assign(producto, data);

    return await this.repo.save(producto);
  }

  async remove(id: number) {
    const producto = await this.findOne(id);

    return await this.repo.save(producto);
  }
}