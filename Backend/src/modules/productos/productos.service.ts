import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { ProductoImagen } from './entities/ProductoImagen.entity'
import { Producto } from './entities/producto.entity';
import { CreateProductoDto, FindProductosDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { Tipo } from '../tipos/entities/tipo.entity';
import { cleanupUploadedFiles, getStoredUploadPath, removeFileIfExists } from '../../common/uploads/upload-paths';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private readonly repo: Repository<Producto>,
    @InjectRepository(ProductoImagen)
    private readonly imagenRepo: Repository<ProductoImagen>,
    @InjectRepository(Tipo)
    private readonly tipoRepo: Repository<Tipo>,
    private readonly dataSource: DataSource,
  ) {}

  private async resolveTipos(ids: number[] | undefined, repository = this.tipoRepo): Promise<Tipo[]> {
    if (!ids?.length) return [];
    const uniqueIds = [...new Set(ids)];
    const tipos = await repository.findBy({ id: In(uniqueIds) });
    if (tipos.length !== uniqueIds.length) {
      const foundIds = new Set(tipos.map((tipo) => tipo.id));
      const missing = uniqueIds.filter((id) => !foundIds.has(id));
      throw new BadRequestException(`Los siguientes tipos no existen: ${missing.join(', ')}`);
    }
    return tipos;
  }

  async create(data: CreateProductoDto, files: Express.Multer.File[]) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const productoRepo = manager.getRepository(Producto);
        const imagenRepo = manager.getRepository(ProductoImagen);
        const tipos = await this.resolveTipos(data.tipos, manager.getRepository(Tipo));
        const producto = productoRepo.create({ ...data, tipos });
        const productoGuardado = await productoRepo.save(producto);
        const imagenes = (files ?? []).map((file) => imagenRepo.create({
          url: `/uploads/productos/${file.filename}`,
          producto: productoGuardado,
        }));
        if (imagenes.length) await imagenRepo.save(imagenes);
        return productoRepo.findOneOrFail({
          where: { id: productoGuardado.id },
          relations: ['imagenes', 'tipos'],
        });
      });
    } catch (error) {
      cleanupUploadedFiles(files);
      throw error;
    }
  }

  async findAll(query: FindProductosDto) {
    const { nombre, desde, hasta, tipo, page = 1, limit = 8 } = query;
    const qb = this.repo.createQueryBuilder('producto')
      .leftJoinAndSelect('producto.imagenes', 'imagenes')
      .leftJoinAndSelect('producto.tipos', 'tipos')
      .orderBy('producto.id', 'DESC');
    // filtro por nombre
    if (nombre) {
      qb.andWhere('producto.codigo LIKE :nombre', {
        nombre: `%${nombre}%`,
      });
    }
    //filtro por fechas
    if (desde) {
      qb.andWhere('producto.fecha_ingreso >= :desde', { desde });
    }
    if (hasta) {
      qb.andWhere('producto.fecha_ingreso <= :hasta', { hasta });
    }
    // filtro por tipo
    if (tipo) {
      qb.andWhere('tipos.id = :tipo', { tipo });
    }
    // paginación
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 8;
    qb.skip((pageNumber - 1) * limitNumber).take(limitNumber);
    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      total,
      page: pageNumber,
      lastPage: Math.ceil(total / limitNumber),
    };
  }

  async findOne(id: number) {
    const producto = await this.repo.findOne({
      where: { id },
      relations: ['imagenes', 'tipos'],
    });

    if (!producto) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    return producto;
  }

  async update(id: number, data: UpdateProductoDto, files?: Express.Multer.File[], canManageInventory = false) {
    let previousImageUrls: string[] = [];
    try {
      await this.dataSource.transaction(async (manager) => {
        const productoRepo = manager.getRepository(Producto);
        const imagenRepo = manager.getRepository(ProductoImagen);
        const producto = await productoRepo.findOne({ where: { id }, relations: ['imagenes', 'tipos'] });
        if (!producto) throw new NotFoundException(`Producto con ID ${id} no encontrado`);
        if (!canManageInventory && (data.precio !== undefined || data.stock !== undefined || data.existencia !== undefined)) throw new BadRequestException('No tiene permiso para modificar precio, stock o existencia');
        if (data.tipos !== undefined) producto.tipos = await this.resolveTipos(data.tipos, manager.getRepository(Tipo));
        const scalarData = { ...data };
        delete scalarData.tipos;
        Object.assign(producto, scalarData);
        await productoRepo.save(producto);
        if (files?.length) {
          previousImageUrls = producto.imagenes.map((imagen) => imagen.url);
          if (producto.imagenes.length) await imagenRepo.remove(producto.imagenes);
          await imagenRepo.save(files.map((file) => imagenRepo.create({
            url: `/uploads/productos/${file.filename}`,
            producto,
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
    const producto = await this.findOne(id);
    if (!producto.activo) throw new BadRequestException('El producto ya está desactivado');
    producto.activo = false;
    await this.repo.save(producto);
    return {
      message: 'Producto desactivado correctamente',
    };
  }

  async reactivar(id: number) {
    const producto = await this.findOne(id);
    if (producto.activo) throw new BadRequestException('El producto ya está activo');
    producto.activo = true;
    await this.repo.save(producto);
    return { message: 'Producto reactivado correctamente' };
  }

  async agregarStock(id: number, cantidad: number) {
    return this.dataSource.transaction(async (manager) => {
      const rows = await manager.query('SELECT id,codigo,stock,existencia,activo FROM catalogo WHERE id=? FOR UPDATE', [id]) as Array<{id:number;codigo:string;stock:number;existencia:number;activo:number}>;
      const producto = rows[0];
      if (!producto) throw new NotFoundException(`Producto con ID ${id} no encontrado`);
      if (!producto.activo) throw new BadRequestException('No se puede agregar stock a un producto inactivo');
      const stockAnterior = Number(producto.stock ?? 0);
      const existenciaAnterior = Number(producto.existencia ?? 0);
      if (stockAnterior + cantidad > 2147483647 || existenciaAnterior + cantidad > 2147483647) throw new BadRequestException('La cantidad excede la capacidad del inventario');
      await manager.query('UPDATE catalogo SET stock=COALESCE(stock,0)+?, existencia=COALESCE(existencia,0)+? WHERE id=?', [cantidad, cantidad, id]);
      return { success: true, message: 'Stock actualizado correctamente', data: { productoId: id, stockAnterior, existenciaAnterior, cantidadAgregada: cantidad, stockNuevo: stockAnterior + cantidad, existenciaNueva: existenciaAnterior + cantidad } };
    });
  }
}
