import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { NotaPago } from './entities/nota-pago.entity';
import { HistorialCompra } from './entities/historial-compra.entity';
import { CreateFacturaDto, FilterFacturasDto } from './dto/create-factura.dto';
import { Producto } from '../productos/entities/producto.entity';
import { DashboardEventsService } from '../dashboard/dashboard-events.service';

const roundMoney = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

@Injectable()
export class FacturasService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly dashboardEvents: DashboardEventsService,
  ) {}

  private assertUniqueProducts(data: CreateFacturaDto) {
    const ids = data.conceptos.map((item) => item.producto_id);
    if (new Set(ids).size !== ids.length) throw new BadRequestException('No se permiten productos duplicados');
  }

  private calculate(data: CreateFacturaDto, products: Map<number, Producto>, originals = new Map<number, number | null>()) {
    let subtotal = 0;
    let descuento = 0;
    let iva = 0;
    const lines = data.conceptos.map((item) => {
      const producto = products.get(item.producto_id)!;
      if (!producto.activo) throw new BadRequestException(`El producto ${producto.codigo} no está activo`);
      if (producto.existencia <= 0 || item.cantidad > producto.existencia)
        throw new BadRequestException(`Stock insuficiente para ${producto.codigo}. Disponible: ${producto.existencia}`);
      const precioUnitario = item.precio_unitario ?? Number(producto.precio);
      if (!Number.isFinite(precioUnitario) || precioUnitario < 0)
        throw new BadRequestException(`Precio inválido para ${producto.codigo}`);
      const bruto = roundMoney(precioUnitario * item.cantidad);
      const montoDescuento = roundMoney(bruto * item.descuento / 100);
      const montoSinIva = roundMoney(bruto - montoDescuento);
      const montoIva = roundMoney(montoSinIva * 0.16);
      const montoTotal = roundMoney(montoSinIva + montoIva);
      subtotal = roundMoney(subtotal + bruto);
      descuento = roundMoney(descuento + montoDescuento);
      iva = roundMoney(iva + montoIva);
      return {
        producto, item, precioUnitario,
        precioOriginal: originals.has(producto.id) ? originals.get(producto.id) : Number(producto.precio),
        montoSinIva, montoIva, montoTotal,
      };
    });
    return { lines, subtotal, descuento, iva, total: roundMoney(subtotal - descuento + iva) };
  }

  private noteValues(data: CreateFacturaDto, totals: { subtotal: number; descuento: number; total: number }) {
    return {
      folio_cliente: data.folio,
      fecha_emision: data.fecha ? new Date(`${data.fecha}T12:00:00`) : new Date(),
      vendedor: data.vendedor,
      almacen: data.almacen,
      id_cliente: data.clienteId ?? null,
      ...totals,
      razon_social: data.cliente.nombre,
      rfc: data.cliente.rfc,
      direccion: data.cliente.direccion,
      colonia: data.cliente.colonia,
      poblacion: data.cliente.poblacion,
      fecha_entrega: new Date(`${data.cliente.fechaEntrega}T00:00:00`),
      operador: data.cliente.operador,
      credito: data.cliente.credito ? 1 : 0,
    };
  }

  private async lockProducts(manager: EntityManager, ids: number[]) {
    const products = await manager.getRepository(Producto).createQueryBuilder('producto')
      .setLock('pessimistic_write').where({ id: In([...ids].sort((a, b) => a - b)) }).getMany();
    if (products.length !== ids.length) {
      const found = new Set(products.map((p) => p.id));
      throw new NotFoundException(`Productos no encontrados: ${ids.filter((id) => !found.has(id)).join(', ')}`);
    }
    return new Map(products.map((p) => [p.id, p]));
  }

  async create(data: CreateFacturaDto) {
    this.assertUniqueProducts(data);
    const result = await this.dataSource.transaction(async (manager) => {
      const products = await this.lockProducts(manager, data.conceptos.map((x) => x.producto_id));
      const calculated = this.calculate(data, products);
      const notaRepo = manager.getRepository(NotaPago);
      const detalleRepo = manager.getRepository(HistorialCompra);
      const nota = await notaRepo.save(notaRepo.create(this.noteValues(data, calculated)));
      await detalleRepo.save(calculated.lines.map((line) => detalleRepo.create({
        id_catalogo: line.producto.id, cantidad: line.item.cantidad,
        precio_original: line.precioOriginal, precio_unitario: line.precioUnitario,
        monto_sin_iva: line.montoSinIva, monto_iva: line.montoIva, monto_total: line.montoTotal,
        factura: nota, producto: line.producto,
      })));
      for (const line of calculated.lines) line.producto.existencia -= line.item.cantidad;
      await manager.getRepository(Producto).save([...products.values()]);
      return { message: 'Factura creada correctamente', id: nota.id, subtotal: calculated.subtotal,
        descuento: calculated.descuento, iva: calculated.iva, total: calculated.total };
    });
    this.dashboardEvents.notifyUpdate();
    return result;
  }

  private serialize(nota: NotaPago) {
    const conceptos = (nota.detalles ?? []).map((d) => ({
      id: d.id, id_catalogo: d.id_catalogo, cantidad: d.cantidad,
      precio_original: d.precio_original == null ? null : Number(d.precio_original),
      precio_unitario: Number(d.precio_unitario), monto_sin_iva: Number(d.monto_sin_iva),
      monto_iva: Number(d.monto_iva), monto_total: Number(d.monto_total), producto: d.producto,
    }));
    return { ...nota, subtotal: Number(nota.subtotal ?? 0), descuento: Number(nota.descuento ?? 0),
      total: Number(nota.total ?? 0), estatus: nota.fecha_cancelado ? 'cancelada' : 'activa', conceptos, detalles: undefined };
  }

  async findAll(filters: FilterFacturasDto) {
    const page = filters.page ?? 1, limit = filters.limit ?? 8;
    const qb = this.dataSource.getRepository(NotaPago).createQueryBuilder('nota')
      .leftJoinAndSelect('nota.detalles', 'detalle').leftJoinAndSelect('detalle.producto', 'producto')
      .leftJoinAndSelect('producto.imagenes', 'imagen').orderBy('nota.id', 'DESC');
    if (filters.folio) qb.andWhere('LOWER(nota.folio_cliente) LIKE LOWER(:folio)', { folio: `%${filters.folio.trim()}%` });
    if (filters.cliente) qb.andWhere('LOWER(nota.razon_social) LIKE LOWER(:cliente)', { cliente: `%${filters.cliente.trim()}%` });
    if (filters.desde) qb.andWhere('DATE(nota.fecha_emision) >= :desde', { desde: filters.desde });
    if (filters.hasta) qb.andWhere('DATE(nota.fecha_emision) <= :hasta', { hasta: filters.hasta });
    if (filters.estatus === 'activa') qb.andWhere('nota.fecha_cancelado IS NULL');
    if (filters.estatus === 'cancelada') qb.andWhere('nota.fecha_cancelado IS NOT NULL');
    if (filters.monto != null) qb.andWhere('nota.total = :monto', { monto: filters.monto });
    const [rows, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    const data = rows.map((n) => this.serialize(n));
    return { data, notas_de_pago: data, total, page, lastPage: Math.max(1, Math.ceil(total / limit)) };
  }

  async findOne(id: number) {
    const nota = await this.dataSource.getRepository(NotaPago).findOne({
      where: { id }, relations: ['detalles', 'detalles.producto', 'detalles.producto.imagenes'],
    });
    if (!nota) throw new NotFoundException('Factura no encontrada');
    return this.serialize(nota);
  }

  async update(id: number, data: CreateFacturaDto) {
    this.assertUniqueProducts(data);
    const result = await this.dataSource.transaction(async (manager) => {
      const notaRepo = manager.getRepository(NotaPago);
      const nota = await notaRepo.createQueryBuilder('nota').setLock('pessimistic_write')
        .leftJoinAndSelect('nota.detalles', 'detalle').where('nota.id = :id', { id }).getOne();
      if (!nota) throw new NotFoundException('Factura no encontrada');
      if (nota.fecha_cancelado) throw new ConflictException('Una factura cancelada no puede editarse');
      const allIds = [...new Set([...nota.detalles.map((d) => d.id_catalogo), ...data.conceptos.map((d) => d.producto_id)])];
      const products = await this.lockProducts(manager, allIds);
      for (const old of nota.detalles) products.get(old.id_catalogo)!.existencia += old.cantidad;
      const originals = new Map(nota.detalles.map((d) => [d.id_catalogo, d.precio_original]));
      const calculated = this.calculate(data, products, originals);
      Object.assign(nota, this.noteValues(data, calculated));
      await notaRepo.save(nota);
      await manager.getRepository(HistorialCompra).remove(nota.detalles);
      const detailRepo = manager.getRepository(HistorialCompra);
      await detailRepo.save(calculated.lines.map((line) => detailRepo.create({
        id_catalogo: line.producto.id, cantidad: line.item.cantidad,
        precio_original: line.precioOriginal, precio_unitario: line.precioUnitario,
        monto_sin_iva: line.montoSinIva, monto_iva: line.montoIva, monto_total: line.montoTotal,
        factura: nota, producto: line.producto,
      })));
      for (const line of calculated.lines) line.producto.existencia -= line.item.cantidad;
      await manager.getRepository(Producto).save([...products.values()]);
      return { message: 'Factura actualizada correctamente', id, subtotal: calculated.subtotal,
        descuento: calculated.descuento, iva: calculated.iva, total: calculated.total };
    });
    this.dashboardEvents.notifyUpdate();
    return result;
  }

  async cancel(id: number) {
    const result = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(NotaPago);
      const nota = await repo.createQueryBuilder('nota').setLock('pessimistic_write')
        .leftJoinAndSelect('nota.detalles', 'detalle').where('nota.id = :id', { id }).getOne();
      if (!nota) throw new NotFoundException('Factura no encontrada');
      if (nota.fecha_cancelado) throw new ConflictException('La factura ya está cancelada');
      const products = await this.lockProducts(manager, [...new Set(nota.detalles.map((d) => d.id_catalogo))]);
      for (const detail of nota.detalles) products.get(detail.id_catalogo)!.existencia += detail.cantidad;
      nota.fecha_cancelado = new Date();
      await manager.getRepository(Producto).save([...products.values()]);
      await repo.save(nota);
      return { message: 'Factura cancelada correctamente', id };
    });
    this.dashboardEvents.notifyUpdate();
    return result;
  }

  async buscarVendedores(search = '') {
    return this.dataSource.getRepository('usuarios').createQueryBuilder('u')
      .where('LOWER(u.identidad) = :identidad', { identidad: 'empleado' }).andWhere('u.estatus = 1')
      .andWhere('LOWER(u.Nombre) LIKE LOWER(:search)', { search: `%${search.trim()}%` }).take(10).getMany();
  }

  async buscarClientes(search = '') {
    return this.dataSource.getRepository('usuarios').createQueryBuilder('u')
      .where('LOWER(u.identidad) = :identidad', { identidad: 'cliente' }).andWhere('u.estatus = 1')
      .andWhere('(LOWER(u.Nombre) LIKE LOWER(:search) OR LOWER(COALESCE(u.rfc,\'\')) LIKE LOWER(:search))', { search: `%${search.trim()}%` })
      .take(10).getMany();
  }

  async precioEfectivo(clienteId: number, productoId: number) {
    const producto = await this.dataSource.getRepository(Producto).findOne({ where: { id: productoId } });
    if (!producto) throw new NotFoundException('Producto no encontrado');
    if (!clienteId) return { precio: Number(producto.precio), origen: 'catalogo' };
    const rows = await this.dataSource.query(
      'SELECT precio FROM clientes_precios_especiales WHERE id_usuario = ? AND id_producto = ? AND estatus = 1 LIMIT 1',
      [clienteId, productoId],
    ) as Array<{ precio: string }>;
    return rows[0] ? { precio: Number(rows[0].precio), origen: 'especial' }
      : { precio: Number(producto.precio), origen: 'catalogo' };
  }
}
