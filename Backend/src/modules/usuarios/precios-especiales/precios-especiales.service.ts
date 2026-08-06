import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { Producto } from '../../productos/entities/producto.entity';
import { Usuario } from '../entities/usuario.entity';
import {
  CreatePrecioEspecialDto,
  FilterPreciosEspecialesDto,
  ProductosDisponiblesDto,
  UpdatePrecioEspecialDto,
} from './dto/precio-especial.dto';
import { ClientePrecioEspecial } from './entities/cliente-precio-especial.entity';

@Injectable()
export class PreciosEspecialesService {
  constructor(
    @InjectRepository(ClientePrecioEspecial)
    private readonly precios: Repository<ClientePrecioEspecial>,
    @InjectRepository(Usuario)
    private readonly usuarios: Repository<Usuario>,
    @InjectRepository(Producto)
    private readonly productos: Repository<Producto>,
    private readonly dataSource: DataSource,
  ) {}

  private async validarCliente(usuarioId: number): Promise<Usuario> {
    const cliente = await this.usuarios.findOne({ where: { id: usuarioId } });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');
    if (cliente.identidad?.trim().toLowerCase() !== 'cliente') {
      throw new BadRequestException(
        'El usuario seleccionado no tiene identidad de cliente',
      );
    }
    return cliente;
  }

  private esDuplicado(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      ['ER_DUP_ENTRY', '1062'].includes(
        String(
          (
            error as QueryFailedError & {
              driverError?: { code?: string; errno?: number };
            }
          ).driverError?.code ??
            (error as QueryFailedError & { driverError?: { errno?: number } })
              .driverError?.errno,
        ),
      )
    );
  }

  async findAll(usuarioId: number, filtros: FilterPreciosEspecialesDto) {
    await this.validarCliente(usuarioId);
    const { page = 1, limit = 8, search, estatus } = filtros;
    const query = this.precios
      .createQueryBuilder('precio')
      .leftJoinAndSelect('precio.producto', 'producto')
      .leftJoinAndSelect('precio.empleado', 'empleado')
      .where('precio.clienteId = :usuarioId', { usuarioId });
    if (search?.trim()) {
      query.andWhere(
        '(LOWER(producto.codigo) LIKE LOWER(:search) OR LOWER(producto.descripcion) LIKE LOWER(:search))',
        { search: `%${search.trim()}%` },
      );
    }
    if (estatus !== undefined)
      query.andWhere('precio.estatus = :estatus', { estatus });
    const [data, total] = await query
      .orderBy('precio.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return {
      data,
      total,
      page,
      limit,
      lastPage: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async productosDisponibles(
    usuarioId: number,
    filtros: ProductosDisponiblesDto,
  ) {
    await this.validarCliente(usuarioId);
    const { page = 1, limit = 10, search } = filtros;
    const query = this.productos
      .createQueryBuilder('producto')
      .where('producto.activo = :activo', { activo: true })
      .andWhere((qb) => {
        const subquery = qb
          .subQuery()
          .select('1')
          .from(ClientePrecioEspecial, 'asignado')
          .where('asignado.id_usuario = :usuarioId')
          .andWhere('asignado.id_producto = producto.id')
          .getQuery();
        return `NOT EXISTS ${subquery}`;
      })
      .setParameter('usuarioId', usuarioId);
    if (search?.trim()) {
      query.andWhere(
        '(LOWER(producto.codigo) LIKE LOWER(:search) OR LOWER(producto.descripcion) LIKE LOWER(:search))',
        { search: `%${search.trim()}%` },
      );
    }
    const [data, total] = await query
      .select([
        'producto.id',
        'producto.codigo',
        'producto.descripcion',
        'producto.precio',
        'producto.activo',
      ])
      .orderBy('producto.codigo', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return {
      data,
      total,
      page,
      limit,
      lastPage: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async create(
    usuarioId: number,
    empleadoId: number,
    dto: CreatePrecioEspecialDto,
  ) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const cliente = await manager
          .getRepository(Usuario)
          .findOne({ where: { id: usuarioId } });
        if (!cliente) throw new NotFoundException('Cliente no encontrado');
        if (cliente.identidad?.trim().toLowerCase() !== 'cliente') {
          throw new BadRequestException(
            'El usuario seleccionado no tiene identidad de cliente',
          );
        }
        const producto = await manager
          .getRepository(Producto)
          .findOne({ where: { id: dto.productoId } });
        if (!producto) throw new NotFoundException('Producto no encontrado');
        if (!producto.activo)
          throw new BadRequestException(
            'No se puede asignar un producto inactivo',
          );
        const repo = manager.getRepository(ClientePrecioEspecial);
        if (
          await repo.existsBy({
            clienteId: usuarioId,
            productoId: dto.productoId,
          })
        ) {
          throw new ConflictException(
            'El producto ya tiene un precio especial para este cliente',
          );
        }
        const precio = repo.create({
          clienteId: usuarioId,
          productoId: dto.productoId,
          precioEspecial: dto.precioEspecial.toFixed(2),
          estatus: 1,
          empleadoId,
        });
        await repo.save(precio);
        return repo.findOneOrFail({
          where: { id: precio.id },
          relations: ['producto', 'empleado'],
        });
      });
    } catch (error) {
      if (this.esDuplicado(error)) {
        throw new ConflictException(
          'El producto ya tiene un precio especial para este cliente',
        );
      }
      throw error;
    }
  }

  async update(
    usuarioId: number,
    precioId: number,
    empleadoId: number,
    dto: UpdatePrecioEspecialDto,
  ) {
    await this.validarCliente(usuarioId);
    if (dto.precioEspecial === undefined && dto.estatus === undefined) {
      throw new BadRequestException('Debe enviar precioEspecial o estatus');
    }
    const precio = await this.precios.findOne({
      where: { id: precioId, clienteId: usuarioId },
      relations: ['producto', 'empleado'],
    });
    if (!precio)
      throw new NotFoundException(
        'Precio especial no encontrado para este cliente',
      );
    if (dto.precioEspecial !== undefined)
      precio.precioEspecial = dto.precioEspecial.toFixed(2);
    if (dto.estatus !== undefined) precio.estatus = dto.estatus;
    precio.empleadoId = empleadoId;
    await this.precios.save(precio);
    return this.precios.findOneOrFail({
      where: { id: precio.id },
      relations: ['producto', 'empleado'],
    });
  }

  async obtenerPrecioParaCliente(
    usuarioId: number,
    productoId: number,
  ): Promise<number> {
    const precio = await this.precios.findOne({
      where: { clienteId: usuarioId, productoId, estatus: 1 },
    });
    if (precio) return Number(precio.precioEspecial);
    const producto = await this.productos.findOne({
      where: { id: productoId },
    });
    if (!producto) throw new NotFoundException('Producto no encontrado');
    return Number(producto.precio);
  }
}
