import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { NotaPago } from './entities/nota-pago.entity';
import { HistorialCompra } from './entities/historial-compra.entity';
import { CreateFacturaDto, FilterFacturasDto } from './dto/create-factura.dto';
import { Producto } from '../productos/entities/producto.entity';
import { DashboardEventsService } from '../dashboard/dashboard-events.service';
import { Usuario } from '../usuarios/entities/usuario.entity';

type FiscalSnapshot = {
  tipo_persona: string;
  rfc: string;
  razon_social: string;
  codigo_postal: string;
  regimen_fiscal: string;
  uso_cfdi: string;
  correo: string;
  telefono: string;
  es_extranjero: number;
  residencia_fiscal: string | null;
  num_reg_id_trib: string | null;
};

const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

type FacturaCreateResult = {
  message: string;
  id: number;
  folio_cliente: string;
  folio_especial: string | null;
  subtotal: number;
  descuento: number;
  iva: number;
  total: number;
};

@Injectable()
export class FacturasService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly dashboardEvents: DashboardEventsService,
  ) {}

  private assertUniqueProducts(data: CreateFacturaDto) {
    const ids = data.conceptos.map((item) => item.producto_id);
    if (new Set(ids).size !== ids.length)
      throw new BadRequestException('No se permiten productos duplicados');
  }

  private calculate(
    data: CreateFacturaDto,
    products: Map<number, Producto>,
    originals = new Map<number, number | null>(),
    effectivePrices = new Map<number, number>(),
  ) {
    let subtotal = 0;
    let descuento = 0;
    let iva = 0;
    const lines = data.conceptos.map((item) => {
      const producto = products.get(item.producto_id)!;
      if (!producto.activo)
        throw new BadRequestException(
          `El producto ${producto.codigo} no está activo`,
        );
      if (producto.existencia <= 0 || item.cantidad > producto.existencia)
        throw new BadRequestException(
          `Stock insuficiente para ${producto.codigo}. Disponible: ${producto.existencia}`,
        );
      const precioUnitario =
        effectivePrices.get(producto.id) ?? Number(producto.precio);
      if (!Number.isFinite(precioUnitario) || precioUnitario < 0)
        throw new BadRequestException(
          `Precio inválido para ${producto.codigo}`,
        );
      const bruto = roundMoney(precioUnitario * item.cantidad);
      const montoDescuento = roundMoney((bruto * item.descuento) / 100);
      const montoSinIva = roundMoney(bruto - montoDescuento);
      const montoIva = roundMoney(montoSinIva * 0.16);
      const montoTotal = roundMoney(montoSinIva + montoIva);
      subtotal = roundMoney(subtotal + bruto);
      descuento = roundMoney(descuento + montoDescuento);
      iva = roundMoney(iva + montoIva);
      return {
        producto,
        item,
        precioUnitario,
        precioOriginal: originals.has(producto.id)
          ? originals.get(producto.id)
          : Number(producto.precio),
        montoSinIva,
        montoIva,
        montoTotal,
      };
    });
    return {
      lines,
      subtotal,
      descuento,
      iva,
      total: roundMoney(subtotal - descuento + iva),
    };
  }

  private noteValues(
    data: CreateFacturaDto,
    totals: { subtotal: number; descuento: number; total: number },
    fiscal: FiscalSnapshot,
  ) {
    return {
      folio_especial: this.normalizeSpecialFolio(data.folioEspecial),
      fecha_emision: data.fecha
        ? new Date(`${data.fecha}T12:00:00`)
        : new Date(),
      vendedor: data.vendedor,
      almacen: data.almacen,
      id_cliente: data.clienteId ?? null,
      datosFiscalesSnapshot: fiscal,
      ...totals,
      razon_social: fiscal.razon_social,
      rfc: fiscal.rfc,
      direccion: data.cliente.direccion,
      colonia: data.cliente.colonia,
      poblacion: data.cliente.poblacion,
      fecha_entrega: new Date(`${data.cliente.fechaEntrega}T00:00:00`),
      operador: data.cliente.operador,
      credito: data.cliente.credito ? 1 : 0,
    };
  }

  private async loadFiscalSnapshot(
    manager: EntityManager,
    clienteId: number,
  ): Promise<FiscalSnapshot> {
    const usuario = await manager.getRepository(Usuario).findOne({
      where: { id: clienteId },
      relations: ['datosFiscales'],
    });
    if (
      !usuario ||
      usuario.estatus !== 1 ||
      String(usuario.identidad).toLowerCase() !== 'cliente'
    ) {
      throw new BadRequestException(
        'El cliente seleccionado no existe o no está activo',
      );
    }
    const fiscal = usuario.datosFiscales;
    if (!fiscal) {
      throw new BadRequestException(
        'El cliente seleccionado no tiene datos fiscales completos',
      );
    }
    return {
      tipo_persona: fiscal.tipoPersona,
      rfc: fiscal.rfc,
      razon_social: fiscal.razonSocial,
      codigo_postal: fiscal.codigoPostal,
      regimen_fiscal: fiscal.regimenFiscal,
      uso_cfdi: fiscal.usoCfdi,
      correo: fiscal.correo,
      telefono: fiscal.telefono,
      es_extranjero: Number(fiscal.esExtranjero),
      residencia_fiscal: fiscal.residenciaFiscal,
      num_reg_id_trib: fiscal.numRegIdTrib,
    };
  }

  private async loadEffectivePrices(
    manager: EntityManager,
    clienteId: number,
    products: Map<number, Producto>,
  ) {
    const prices = new Map(
      [...products].map(([id, product]) => [id, Number(product.precio)]),
    );
    const ids = [...products.keys()];
    if (!ids.length) return prices;
    const placeholders = ids.map(() => '?').join(',');
    const rows = await manager.query<
      Array<{ id_producto: number; precio: string | number }>
    >(
      `SELECT id_producto, precio FROM clientes_precios_especiales
       WHERE id_usuario = ? AND estatus = 1 AND id_producto IN (${placeholders})`,
      [clienteId, ...ids],
    );
    for (const row of rows)
      prices.set(Number(row.id_producto), Number(row.precio));
    return prices;
  }

  private normalizeSpecialFolio(value: string | null | undefined) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized || null;
  }

  private async nextFolio(manager: EntityManager, now = new Date()) {
    const year = now.getFullYear();
    await manager.query(
      `INSERT INTO factura_folio_consecutivos (anio, ultimo_consecutivo)
       VALUES (?, LAST_INSERT_ID(1))
       ON DUPLICATE KEY UPDATE
         ultimo_consecutivo = LAST_INSERT_ID(ultimo_consecutivo + 1)`,
      [year],
    );
    const rawRows: unknown = await manager.query(
      'SELECT LAST_INSERT_ID() consecutivo',
    );
    const firstRow = Array.isArray(rawRows)
      ? (rawRows[0] as Record<string, unknown> | undefined)
      : undefined;
    const sequence = Number(firstRow?.consecutivo);
    if (!Number.isSafeInteger(sequence) || sequence < 1) {
      throw new ConflictException(
        'No fue posible asignar el folio de la factura',
      );
    }
    return `FAC-${year}-${String(sequence).padStart(6, '0')}`;
  }

  private isDuplicateFolioError(error: unknown) {
    const databaseError = error as {
      code?: string;
      driverError?: { code?: string; constraint?: string };
      message?: string;
    };
    return (
      (databaseError.code === 'ER_DUP_ENTRY' ||
        databaseError.driverError?.code === 'ER_DUP_ENTRY') &&
      String(databaseError.message ?? '').includes('folio')
    );
  }

  private async lockProducts(manager: EntityManager, ids: number[]) {
    const products = await manager
      .getRepository(Producto)
      .createQueryBuilder('producto')
      .setLock('pessimistic_write')
      .where({ id: In([...ids].sort((a, b) => a - b)) })
      .getMany();
    if (products.length !== ids.length) {
      const found = new Set(products.map((p) => p.id));
      throw new NotFoundException(
        `Productos no encontrados: ${ids.filter((id) => !found.has(id)).join(', ')}`,
      );
    }
    return new Map(products.map((p) => [p.id, p]));
  }

  async create(
    data: CreateFacturaDto,
    userId?: number,
  ): Promise<FacturaCreateResult> {
    this.assertUniqueProducts(data);
    try {
      const result = await this.dataSource.transaction<FacturaCreateResult>(
        async (manager) => {
          const products = await this.lockProducts(
            manager,
            data.conceptos.map((x) => x.producto_id),
          );
          const fiscal = await this.loadFiscalSnapshot(manager, data.clienteId);
          const effectivePrices = await this.loadEffectivePrices(
            manager,
            data.clienteId,
            products,
          );
          const calculated = this.calculate(
            data,
            products,
            new Map(),
            effectivePrices,
          );
          const generatedFolio = await this.nextFolio(manager);
          const notaRepo = manager.getRepository(NotaPago);
          const detalleRepo = manager.getRepository(HistorialCompra);
          const nota = await notaRepo.save(
            notaRepo.create({
              ...this.noteValues(data, calculated, fiscal),
              folio_cliente: generatedFolio,
              timbrada: 0,
              creadoPorUsuarioId: userId ?? null,
            }),
          );
          await detalleRepo.save(
            calculated.lines.map((line) =>
              detalleRepo.create({
                id_catalogo: line.producto.id,
                cantidad: line.item.cantidad,
                precio_original: line.precioOriginal,
                precio_unitario: line.precioUnitario,
                monto_sin_iva: line.montoSinIva,
                monto_iva: line.montoIva,
                monto_total: line.montoTotal,
                factura: nota,
                producto: line.producto,
              }),
            ),
          );
          for (const line of calculated.lines)
            line.producto.existencia -= line.item.cantidad;
          await manager.getRepository(Producto).save([...products.values()]);
          return {
            message: 'Factura creada correctamente',
            id: nota.id,
            folio_cliente: nota.folio_cliente,
            folio_especial: nota.folio_especial,
            subtotal: calculated.subtotal,
            descuento: calculated.descuento,
            iva: calculated.iva,
            total: calculated.total,
          };
        },
      );
      this.dashboardEvents.notifyUpdate();
      return result;
    } catch (error) {
      if (this.isDuplicateFolioError(error)) {
        throw new ConflictException(
          'No fue posible asignar un folio único. Intenta crear la factura nuevamente.',
        );
      }
      throw error;
    }
  }

  private serialize(nota: NotaPago) {
    const conceptos = (nota.detalles ?? []).map((d) => ({
      id: d.id,
      id_catalogo: d.id_catalogo,
      cantidad: d.cantidad,
      precio_original:
        d.precio_original == null ? null : Number(d.precio_original),
      precio_unitario: Number(d.precio_unitario),
      monto_sin_iva: Number(d.monto_sin_iva),
      monto_iva: Number(d.monto_iva),
      monto_total: Number(d.monto_total),
      producto: d.producto,
    }));
    const timbrada = Number(nota.timbrada ?? 0);
    const estatus = nota.fecha_cancelado
      ? 'cancelada'
      : timbrada === 1
        ? 'timbrada'
        : 'pendiente';
    return {
      ...nota,
      timbrada,
      subtotal: Number(nota.subtotal ?? 0),
      descuento: Number(nota.descuento ?? 0),
      total: Number(nota.total ?? 0),
      estatus,
      conceptos,
      detalles: undefined,
    };
  }

  async findAll(
    filters: FilterFacturasDto,
    userId?: number,
    canViewAll = true,
  ) {
    const page = filters.page ?? 1,
      limit = filters.limit ?? 8;
    const qb = this.dataSource
      .getRepository(NotaPago)
      .createQueryBuilder('nota')
      .leftJoinAndSelect('nota.detalles', 'detalle')
      .leftJoinAndSelect('detalle.producto', 'producto')
      .leftJoinAndSelect('producto.imagenes', 'imagen')
      .orderBy('nota.id', 'DESC');
    if (!canViewAll)
      qb.andWhere('nota.creadoPorUsuarioId = :currentUserId', {
        currentUserId: userId,
      });
    if (filters.folio)
      qb.andWhere(
        `(LOWER(nota.folio_cliente) LIKE LOWER(:folio)
          OR LOWER(COALESCE(nota.folio_especial, '')) LIKE LOWER(:folio))`,
        { folio: `%${filters.folio.trim()}%` },
      );
    if (filters.cliente)
      qb.andWhere('LOWER(nota.razon_social) LIKE LOWER(:cliente)', {
        cliente: `%${filters.cliente.trim()}%`,
      });
    if (filters.desde)
      qb.andWhere('DATE(nota.fecha_emision) >= :desde', {
        desde: filters.desde,
      });
    if (filters.hasta)
      qb.andWhere('DATE(nota.fecha_emision) <= :hasta', {
        hasta: filters.hasta,
      });
    if (filters.estatus === 'activa')
      qb.andWhere('nota.fecha_cancelado IS NULL');
    if (filters.estatus === 'cancelada')
      qb.andWhere('nota.fecha_cancelado IS NOT NULL');
    if (filters.monto != null)
      qb.andWhere('nota.total = :monto', { monto: filters.monto });
    const [rows, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    const data = rows.map((n) => this.serialize(n));
    return {
      data,
      notas_de_pago: data,
      total,
      page,
      lastPage: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(id: number, userId?: number, canViewAll = true) {
    const nota = await this.dataSource.getRepository(NotaPago).findOne({
      where: { id },
      relations: [
        'detalles',
        'detalles.producto',
        'detalles.producto.imagenes',
      ],
    });
    if (!nota) throw new NotFoundException('Factura no encontrada');
    if (!canViewAll && nota.creadoPorUsuarioId !== userId)
      throw new NotFoundException('Factura no encontrada');
    return this.serialize(nota);
  }

  async update(
    id: number,
    data: CreateFacturaDto,
    userId?: number,
    canViewAll = true,
  ) {
    this.assertUniqueProducts(data);
    const result = await this.dataSource.transaction(async (manager) => {
      const notaRepo = manager.getRepository(NotaPago);
      const nota = await notaRepo
        .createQueryBuilder('nota')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('nota.detalles', 'detalle')
        .where('nota.id = :id', { id })
        .getOne();
      if (!nota) throw new NotFoundException('Factura no encontrada');
      if (!canViewAll && nota.creadoPorUsuarioId !== userId)
        throw new NotFoundException('Factura no encontrada');
      if (nota.fecha_cancelado)
        throw new ConflictException('Una factura cancelada no puede editarse');
      const allIds = [
        ...new Set([
          ...nota.detalles.map((d) => d.id_catalogo),
          ...data.conceptos.map((d) => d.producto_id),
        ]),
      ];
      const products = await this.lockProducts(manager, allIds);
      for (const old of nota.detalles)
        products.get(old.id_catalogo)!.existencia += old.cantidad;
      const originals = new Map(
        nota.detalles.map((d) => [d.id_catalogo, d.precio_original]),
      );
      const fiscal = await this.loadFiscalSnapshot(manager, data.clienteId);
      const effectivePrices = await this.loadEffectivePrices(
        manager,
        data.clienteId,
        products,
      );
      const recalculated = this.calculate(
        data,
        products,
        originals,
        effectivePrices,
      );
      Object.assign(nota, this.noteValues(data, recalculated, fiscal));
      await notaRepo.save(nota);
      await manager.getRepository(HistorialCompra).remove(nota.detalles);
      const detailRepo = manager.getRepository(HistorialCompra);
      await detailRepo.save(
        recalculated.lines.map((line) =>
          detailRepo.create({
            id_catalogo: line.producto.id,
            cantidad: line.item.cantidad,
            precio_original: line.precioOriginal,
            precio_unitario: line.precioUnitario,
            monto_sin_iva: line.montoSinIva,
            monto_iva: line.montoIva,
            monto_total: line.montoTotal,
            factura: nota,
            producto: line.producto,
          }),
        ),
      );
      for (const line of recalculated.lines)
        line.producto.existencia -= line.item.cantidad;
      await manager.getRepository(Producto).save([...products.values()]);
      return {
        message: 'Factura actualizada correctamente',
        id,
        folio_cliente: nota.folio_cliente,
        folio_especial: nota.folio_especial,
        subtotal: recalculated.subtotal,
        descuento: recalculated.descuento,
        iva: recalculated.iva,
        total: recalculated.total,
      };
    });
    this.dashboardEvents.notifyUpdate();
    return result;
  }

  async cancel(id: number, userId?: number, canViewAll = true) {
    const result = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(NotaPago);
      const nota = await repo
        .createQueryBuilder('nota')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('nota.detalles', 'detalle')
        .where('nota.id = :id', { id })
        .getOne();
      if (!nota) throw new NotFoundException('Factura no encontrada');
      if (!canViewAll && nota.creadoPorUsuarioId !== userId)
        throw new NotFoundException('Factura no encontrada');
      if (nota.fecha_cancelado)
        throw new ConflictException('La factura ya está cancelada');
      const products = await this.lockProducts(manager, [
        ...new Set(nota.detalles.map((d) => d.id_catalogo)),
      ]);
      for (const detail of nota.detalles)
        products.get(detail.id_catalogo)!.existencia += detail.cantidad;
      nota.fecha_cancelado = new Date();
      await manager.getRepository(Producto).save([...products.values()]);
      await repo.save(nota);
      return { message: 'Factura cancelada correctamente', id };
    });
    this.dashboardEvents.notifyUpdate();
    return result;
  }

  async timbrar(id: number, userId?: number, canViewAll = true) {
    const result = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(NotaPago);
      const factura = await repo
        .createQueryBuilder('nota')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('nota.detalles', 'detalle')
        .where('nota.id = :id', { id })
        .getOne();
      if (!factura) throw new NotFoundException('Factura no encontrada');
      if (!canViewAll && factura.creadoPorUsuarioId !== userId)
        throw new NotFoundException('Factura no encontrada');
      if (factura.fecha_cancelado)
        throw new ConflictException(
          'Una factura cancelada no puede simularse como timbrada',
        );
      if (Number(factura.timbrada) === 1)
        return { factura, alreadyStamped: true };
      if (!factura.folio_cliente)
        throw new BadRequestException('La factura no tiene folio principal');
      if (!factura.detalles?.length)
        throw new BadRequestException('La factura no tiene conceptos');
      if (!factura.id_cliente || !factura.datosFiscalesSnapshot)
        throw new BadRequestException(
          'La factura no tiene un snapshot fiscal válido del cliente',
        );
      factura.timbrada = 1;
      factura.fecha_timbrado = new Date();
      return { factura: await repo.save(factura), alreadyStamped: false };
    });
    if (!result.alreadyStamped) this.dashboardEvents.notifyUpdate();
    return {
      message: result.alreadyStamped
        ? 'La factura ya se encuentra marcada como timbrada'
        : 'Factura marcada como timbrada correctamente',
      id: result.factura.id,
      timbrada: 1,
      fecha_timbrado: result.factura.fecha_timbrado,
    };
  }

  async buscarProductos(search = '', limit = 10) {
    const term = search.trim();
    if (!term) return [];
    return this.dataSource
      .getRepository(Producto)
      .createQueryBuilder('producto')
      .select([
        'producto.id',
        'producto.codigo',
        'producto.descripcion',
        'producto.precio',
        'producto.existencia',
        'producto.activo',
      ])
      .where('producto.activo = :active', { active: true })
      .andWhere('producto.existencia > 0')
      .andWhere(
        '(LOWER(producto.codigo) LIKE LOWER(:term) OR LOWER(producto.descripcion) LIKE LOWER(:term))',
        { term: `%${term}%` },
      )
      .orderBy(
        'CASE WHEN LOWER(producto.codigo) = LOWER(:exact) THEN 0 ELSE 1 END',
        'ASC',
      )
      .addOrderBy('producto.codigo', 'ASC')
      .setParameter('exact', term)
      .take(Math.min(10, Math.max(1, limit)))
      .getMany();
  }

  async buscarVendedores(search = '') {
    return this.dataSource
      .getRepository(Usuario)
      .createQueryBuilder('u')
      .where('LOWER(u.identidad) = :identidad', { identidad: 'empleado' })
      .andWhere('u.estatus = 1')
      .andWhere('LOWER(u.Nombre) LIKE LOWER(:search)', {
        search: `%${search.trim()}%`,
      })
      .take(10)
      .getMany();
  }

  async buscarClientes(search = '') {
    const clients = await this.dataSource
      .getRepository(Usuario)
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.datosFiscales', 'fiscal')
      .where('LOWER(u.identidad) = :identidad', { identidad: 'cliente' })
      .andWhere('u.estatus = 1')
      .andWhere(
        "(LOWER(u.Nombre) LIKE LOWER(:search) OR LOWER(COALESCE(u.rfc,'')) LIKE LOWER(:search))",
        { search: `%${search.trim()}%` },
      )
      .take(10)
      .getMany();
    return clients.map((user) => ({
      id: user.id,
      Nombre: user.Nombre,
      Apellido_p: user.Apellido_p,
      Apellido_m: user.Apellido_m,
      Calle: user.Calle,
      num_interior: user.num_interior,
      num_exterior: user.num_exterior,
      poblacion: user.poblacion,
      colonia: user.colonia,
      cp: user.cp,
      estatus: user.estatus,
      identidad: user.identidad,
      datosFiscales: user.datosFiscales,
    }));
  }

  async precioEfectivo(clienteId: number, productoId: number) {
    const producto = await this.dataSource
      .getRepository(Producto)
      .findOne({ where: { id: productoId } });
    if (!producto) throw new NotFoundException('Producto no encontrado');
    if (!clienteId)
      return { precio: Number(producto.precio), origen: 'catalogo' };
    const rawRows: unknown = await this.dataSource.query(
      'SELECT precio FROM clientes_precios_especiales WHERE id_usuario = ? AND id_producto = ? AND estatus = 1 LIMIT 1',
      [clienteId, productoId],
    );
    const firstRow = Array.isArray(rawRows)
      ? (rawRows[0] as Record<string, unknown> | undefined)
      : undefined;
    return firstRow
      ? { precio: Number(firstRow.precio), origen: 'especial' }
      : { precio: Number(producto.precio), origen: 'catalogo' };
  }
}
