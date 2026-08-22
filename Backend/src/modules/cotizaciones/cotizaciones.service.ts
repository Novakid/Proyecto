import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { Producto } from '../productos/entities/producto.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { NotaPago } from '../facturacion/entities/nota-pago.entity';
import { HistorialCompra } from '../facturacion/entities/historial-compra.entity';
import { DashboardEventsService } from '../dashboard/dashboard-events.service';
import { FilterCotizacionesDto, SaveCotizacionDto } from './dto/cotizacion.dto';
import { Cotizacion, EstadoCotizacion } from './entities/cotizacion.entity';
import { CotizacionDetalle } from './entities/cotizacion-detalle.entity';

const IVA_RATE = 0.16;
const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

@Injectable()
export class CotizacionesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly dashboardEvents: DashboardEventsService,
  ) {}

  private async nextQuoteFolio(manager: EntityManager) {
    const year = new Date().getFullYear();
    await manager.query(
      `INSERT INTO cotizacion_folio_consecutivos (anio,ultimo_consecutivo) VALUES (?,LAST_INSERT_ID(1)) ON DUPLICATE KEY UPDATE ultimo_consecutivo=LAST_INSERT_ID(ultimo_consecutivo+1)`,
      [year],
    );
    const rows = await manager.query<Array<{ consecutivo: number }>>(
      'SELECT LAST_INSERT_ID() consecutivo',
    );
    const sequence = Number(rows[0]?.consecutivo);
    if (!Number.isSafeInteger(sequence) || sequence < 1)
      throw new ConflictException(
        'No fue posible generar el folio de cotización',
      );
    return `COT-${year}-${String(sequence).padStart(6, '0')}`;
  }

  private async nextInvoiceFolio(manager: EntityManager) {
    const year = new Date().getFullYear();
    await manager.query(
      `INSERT INTO factura_folio_consecutivos (anio,ultimo_consecutivo) VALUES (?,LAST_INSERT_ID(1)) ON DUPLICATE KEY UPDATE ultimo_consecutivo=LAST_INSERT_ID(ultimo_consecutivo+1)`,
      [year],
    );
    const rows = await manager.query<Array<{ consecutivo: number }>>(
      'SELECT LAST_INSERT_ID() consecutivo',
    );
    return `FAC-${year}-${String(Number(rows[0]?.consecutivo)).padStart(6, '0')}`;
  }

  private async fiscalSnapshot(manager: EntityManager, clienteId: number) {
    const user = await manager
      .getRepository(Usuario)
      .findOne({ where: { id: clienteId }, relations: ['datosFiscales'] });
    if (
      !user ||
      user.estatus !== 1 ||
      String(user.identidad).toLowerCase() !== 'cliente'
    )
      throw new BadRequestException('El cliente no existe o no está activo');
    if (!user.datosFiscales)
      throw new BadRequestException(
        'El cliente no tiene datos fiscales completos',
      );
    const f = user.datosFiscales;
    return {
      tipo_persona: f.tipoPersona,
      rfc: f.rfc,
      razon_social: f.razonSocial,
      codigo_postal: f.codigoPostal,
      regimen_fiscal: f.regimenFiscal,
      uso_cfdi: f.usoCfdi,
      correo: f.correo,
      telefono: f.telefono,
      es_extranjero: Number(f.esExtranjero),
      residencia_fiscal: f.residenciaFiscal,
      num_reg_id_trib: f.numRegIdTrib,
      direccion: [user.Calle, user.num_exterior, user.num_interior]
        .filter(Boolean)
        .join(' '),
      colonia: user.colonia || '',
      poblacion: user.poblacion || '',
    };
  }

  private async validateSeller(manager: EntityManager, id: number) {
    const seller = await manager
      .getRepository(Usuario)
      .findOne({ where: { id } });
    if (
      !seller ||
      seller.estatus !== 1 ||
      String(seller.identidad).toLowerCase() === 'cliente'
    )
      throw new BadRequestException('El vendedor no existe o no está activo');
    return seller;
  }

  private async loadProducts(
    manager: EntityManager,
    ids: number[],
    lock = false,
  ) {
    const qb = manager
      .getRepository(Producto)
      .createQueryBuilder('producto')
      .where({ id: In([...new Set(ids)].sort((a, b) => a - b)) });
    if (lock) qb.setLock('pessimistic_write');
    const products = await qb.getMany();
    const unique = [...new Set(ids)];
    if (products.length !== unique.length)
      throw new NotFoundException('Uno o más productos no existen');
    return new Map(products.map((product) => [product.id, product]));
  }

  private async effectivePrices(
    manager: EntityManager,
    clientId: number,
    products: Map<number, Producto>,
  ) {
    const prices = new Map(
      [...products].map(([id, product]) => [id, Number(product.precio)]),
    );
    const ids = [...products.keys()];
    if (!ids.length) return prices;
    const rows = await manager.query<
      Array<{ id_producto: number; precio: string | number }>
    >(
      `SELECT id_producto,precio FROM clientes_precios_especiales WHERE id_usuario=? AND estatus=1 AND id_producto IN (${ids.map(() => '?').join(',')})`,
      [clientId, ...ids],
    );
    rows.forEach((row) =>
      prices.set(Number(row.id_producto), Number(row.precio)),
    );
    return prices;
  }

  private calculate(
    dto: SaveCotizacionDto,
    products: Map<number, Producto>,
    prices: Map<number, number>,
  ) {
    if (
      new Set(dto.conceptos.map((x) => x.productoId)).size !==
      dto.conceptos.length
    )
      throw new BadRequestException('No se permiten productos duplicados');
    let subtotal = 0,
      descuento = 0,
      iva = 0;
    const lines = dto.conceptos.map((item) => {
      const product = products.get(item.productoId)!;
      if (!product.activo)
        throw new BadRequestException(
          `El producto ${product.codigo} no está activo`,
        );
      if (item.cantidad > Number(product.existencia))
        throw new BadRequestException(
          `Cantidad superior a la existencia de ${product.codigo}`,
        );
      const unitPrice = Number(prices.get(product.id));
      const gross = roundMoney(unitPrice * item.cantidad);
      const discountAmount = roundMoney((gross * item.descuento) / 100);
      const base = roundMoney(gross - discountAmount);
      const tax = roundMoney(base * IVA_RATE);
      subtotal = roundMoney(subtotal + gross);
      descuento = roundMoney(descuento + discountAmount);
      iva = roundMoney(iva + tax);
      return {
        product,
        item,
        unitPrice,
        gross,
        discountAmount,
        base,
        tax,
        total: roundMoney(base + tax),
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

  private detailEntities(
    manager: EntityManager,
    quote: Cotizacion,
    calculated: ReturnType<CotizacionesService['calculate']>,
  ) {
    const repo = manager.getRepository(CotizacionDetalle);
    return calculated.lines.map((line) =>
      repo.create({
        cotizacion: quote,
        cotizacionId: quote.id,
        productoId: line.product.id,
        codigoProducto: line.product.codigo,
        nombreProducto: line.product.descripcion,
        cantidad: line.item.cantidad,
        precioOriginal: Number(line.product.precio),
        precioUnitario: line.unitPrice,
        descuento: line.item.descuento,
        montoDescuento: line.discountAmount,
        montoSinIva: line.base,
        montoIva: line.tax,
        montoTotal: line.total,
        redem: 0,
      }),
    );
  }

  async create(dto: SaveCotizacionDto, userId: number) {
    return this.dataSource.transaction(async (manager) => {
      const fiscal = await this.fiscalSnapshot(manager, dto.clienteId);
      await this.validateSeller(manager, dto.vendedorId);
      const products = await this.loadProducts(
        manager,
        dto.conceptos.map((x) => x.productoId),
      );
      const calculated = this.calculate(
        dto,
        products,
        await this.effectivePrices(manager, dto.clienteId, products),
      );
      const repo = manager.getRepository(Cotizacion);
      const quote = await repo.save(
        repo.create({
          folioCotizacion: await this.nextQuoteFolio(manager),
          folioEspecial: dto.folioEspecial?.trim() || null,
          clienteId: dto.clienteId,
          vendedorId: dto.vendedorId,
          creadoPorUsuarioId: userId,
          metodoPago: dto.metodoPago?.trim() || null,
          credito: dto.credito ? 1 : 0,
          almacen: dto.almacen,
          fechaVigencia: dto.fechaVigencia
            ? new Date(`${dto.fechaVigencia}T00:00:00`)
            : null,
          fechaEntrega: dto.fechaEntrega
            ? new Date(`${dto.fechaEntrega}T00:00:00`)
            : null,
          observaciones: dto.observaciones?.trim() || null,
          datosFiscalesSnapshot: fiscal,
          ...calculated,
          solicitada: EstadoCotizacion.PENDIENTE,
        }),
      );
      await manager
        .getRepository(CotizacionDetalle)
        .save(this.detailEntities(manager, quote, calculated));
      return {
        message: 'Cotización creada correctamente',
        id: quote.id,
        folio: quote.folioCotizacion,
      };
    });
  }

  private serialize(quote: Cotizacion) {
    return {
      ...quote,
      subtotal: Number(quote.subtotal),
      descuento: Number(quote.descuento),
      iva: Number(quote.iva),
      total: Number(quote.total),
      detalles: (quote.detalles || []).map((d) => ({
        ...d,
        precioOriginal:
          d.precioOriginal == null ? null : Number(d.precioOriginal),
        precioUnitario: Number(d.precioUnitario),
        descuento: Number(d.descuento),
        montoDescuento: Number(d.montoDescuento),
        montoSinIva: Number(d.montoSinIva),
        montoIva: Number(d.montoIva),
        montoTotal: Number(d.montoTotal),
      })),
    };
  }

  async findAll(filters: FilterCotizacionesDto) {
    const page = filters.page ?? 1,
      limit = filters.limit ?? 8;
    const qb = this.dataSource
      .getRepository(Cotizacion)
      .createQueryBuilder('q')
      .leftJoinAndSelect('q.detalles', 'd')
      .orderBy('q.id', 'DESC');
    if (filters.folio)
      qb.andWhere(
        '(q.folioCotizacion LIKE :folio OR q.folioEspecial LIKE :folio)',
        { folio: `%${filters.folio}%` },
      );
    if (filters.cliente)
      qb.andWhere(
        "JSON_UNQUOTE(JSON_EXTRACT(q.datosFiscalesSnapshot,'$.razon_social')) LIKE :cliente",
        { cliente: `%${filters.cliente}%` },
      );
    if (filters.desde)
      qb.andWhere('DATE(q.fechaCotizacion)>=:desde', { desde: filters.desde });
    if (filters.hasta)
      qb.andWhere('DATE(q.fechaCotizacion)<=:hasta', { hasta: filters.hasta });
    if (filters.monto != null)
      qb.andWhere('q.total=:monto', { monto: filters.monto });
    if (filters.solicitada != null)
      qb.andWhere('q.solicitada=:status', { status: filters.solicitada });
    const [rows, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return {
      data: rows.map((row) => this.serialize(row)),
      total,
      page,
      lastPage: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(id: number) {
    const quote = await this.dataSource
      .getRepository(Cotizacion)
      .findOne({ where: { id }, relations: ['detalles'] });
    if (!quote) throw new NotFoundException('Cotización no encontrada');
    return this.serialize(quote);
  }

  async update(id: number, dto: SaveCotizacionDto) {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Cotizacion);
      const quote = await repo
        .createQueryBuilder('q')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('q.detalles', 'd')
        .where('q.id=:id', { id })
        .getOne();
      if (!quote) throw new NotFoundException('Cotización no encontrada');
      if (quote.solicitada !== EstadoCotizacion.PENDIENTE)
        throw new ConflictException(
          'Solo se pueden editar cotizaciones pendientes',
        );
      const fiscal = await this.fiscalSnapshot(manager, dto.clienteId);
      await this.validateSeller(manager, dto.vendedorId);
      const products = await this.loadProducts(
        manager,
        dto.conceptos.map((x) => x.productoId),
      );
      const calculated = this.calculate(
        dto,
        products,
        await this.effectivePrices(manager, dto.clienteId, products),
      );
      Object.assign(quote, {
        folioEspecial: dto.folioEspecial?.trim() || null,
        clienteId: dto.clienteId,
        vendedorId: dto.vendedorId,
        metodoPago: dto.metodoPago?.trim() || null,
        credito: dto.credito ? 1 : 0,
        almacen: dto.almacen,
        fechaVigencia: dto.fechaVigencia
          ? new Date(`${dto.fechaVigencia}T00:00:00`)
          : null,
        fechaEntrega: dto.fechaEntrega
          ? new Date(`${dto.fechaEntrega}T00:00:00`)
          : null,
        observaciones: dto.observaciones?.trim() || null,
        datosFiscalesSnapshot: fiscal,
        ...calculated,
      });
      await repo.save(quote);
      await manager.getRepository(CotizacionDetalle).remove(quote.detalles);
      await manager
        .getRepository(CotizacionDetalle)
        .save(this.detailEntities(manager, quote, calculated));
      return {
        message: 'Cotización actualizada correctamente',
        id,
        folio: quote.folioCotizacion,
      };
    });
  }

  async cancel(id: number) {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Cotizacion);
      const quote = await repo
        .createQueryBuilder('q')
        .setLock('pessimistic_write')
        .where('q.id=:id', { id })
        .getOne();
      if (!quote) throw new NotFoundException('Cotización no encontrada');
      if (quote.solicitada !== EstadoCotizacion.PENDIENTE)
        throw new ConflictException(
          'Solo se pueden cancelar cotizaciones pendientes',
        );
      quote.solicitada = EstadoCotizacion.CANCELADA;
      quote.fechaCancelada = new Date();
      await repo.save(quote);
      await manager.update(
        CotizacionDetalle,
        { cotizacionId: id, redem: 0 },
        { redem: 2 },
      );
      return { message: 'Cotización cancelada correctamente' };
    });
  }

  async reactivate(id: number) {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Cotizacion);
      const quote = await repo
        .createQueryBuilder('q')
        .setLock('pessimistic_write')
        .where('q.id=:id', { id })
        .getOne();
      if (!quote) throw new NotFoundException('Cotización no encontrada');
      if (quote.solicitada !== EstadoCotizacion.CANCELADA)
        throw new ConflictException(
          'Solo se pueden reactivar cotizaciones canceladas',
        );
      quote.solicitada = EstadoCotizacion.PENDIENTE;
      quote.fechaCancelada = null;
      quote.fechaReactivada = new Date();
      await repo.save(quote);
      await manager.update(
        CotizacionDetalle,
        { cotizacionId: id, redem: 2 },
        { redem: 0 },
      );
      return { message: 'Cotización reactivada correctamente' };
    });
  }

  async generateInvoice(id: number, userId: number) {
    const result = await this.dataSource.transaction(async (manager) => {
      const quoteRepo = manager.getRepository(Cotizacion);
      const quote = await quoteRepo
        .createQueryBuilder('q')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('q.detalles', 'd', 'd.redem=0')
        .where('q.id=:id', { id })
        .getOne();
      if (!quote) throw new NotFoundException('Cotización no encontrada');
      if (quote.solicitada !== EstadoCotizacion.PENDIENTE)
        throw new ConflictException(
          'Esta cotización ya fue procesada o cancelada',
        );
      if (!quote.detalles.length)
        throw new BadRequestException(
          'La cotización no tiene conceptos pendientes',
        );
      if (!quote.clienteId || !quote.vendedorId || !quote.datosFiscalesSnapshot)
        throw new BadRequestException(
          'La cotización no tiene cliente, vendedor o datos fiscales válidos',
        );
      const seller = await this.validateSeller(manager, quote.vendedorId);
      const products = await this.loadProducts(
        manager,
        quote.detalles.map((x) => Number(x.productoId)),
        true,
      );
      for (const detail of quote.detalles) {
        const product = products.get(Number(detail.productoId))!;
        if (!product.activo)
          throw new BadRequestException(
            `El producto ${product.codigo} no está activo`,
          );
        if (Number(detail.cantidad) > Number(product.existencia))
          throw new BadRequestException(
            `Stock insuficiente para ${product.codigo}`,
          );
      }
      const fiscal = quote.datosFiscalesSnapshot as Record<string, string>;
      const noteRepo = manager.getRepository(NotaPago);
      const note = await noteRepo.save(
        noteRepo.create({
          folio_cliente: await this.nextInvoiceFolio(manager),
          folio_especial: quote.folioEspecial,
          fecha_emision: new Date(),
          timbrada: 0,
          id_cliente: quote.clienteId,
          vendedor: seller.Nombre,
          almacen: quote.almacen || '',
          subtotal: Number(quote.subtotal),
          descuento: Number(quote.descuento),
          total: Number(quote.total),
          razon_social: fiscal.razon_social || '',
          rfc: fiscal.rfc || '',
          direccion: fiscal.direccion || '',
          colonia: fiscal.colonia || '',
          poblacion: fiscal.poblacion || '',
          fecha_entrega: quote.fechaEntrega ?? undefined,
          operador: seller.Nombre,
          credito: quote.credito,
          creadoPorUsuarioId: userId,
          datosFiscalesSnapshot: quote.datosFiscalesSnapshot,
        }),
      );
      const historyRepo = manager.getRepository(HistorialCompra);
      await historyRepo.save(
        quote.detalles.map((detail) =>
          historyRepo.create({
            id_catalogo: Number(detail.productoId),
            cantidad: Number(detail.cantidad),
            precio_original: Number(detail.precioOriginal),
            precio_unitario: Number(detail.precioUnitario),
            monto_sin_iva: Number(detail.montoSinIva),
            monto_iva: Number(detail.montoIva),
            monto_total: Number(detail.montoTotal),
            factura: note,
            producto: products.get(Number(detail.productoId)),
          }),
        ),
      );
      for (const detail of quote.detalles)
        products.get(Number(detail.productoId))!.existencia -= Number(
          detail.cantidad,
        );
      await manager.getRepository(Producto).save([...products.values()]);
      quote.solicitada = EstadoCotizacion.PROCESADA;
      quote.fechaSolicitada = new Date();
      await quoteRepo.save(quote);
      await manager.update(
        CotizacionDetalle,
        { cotizacionId: id, redem: 0 },
        { redem: 1 },
      );
      return {
        message: 'La cotización fue enviada a facturación correctamente',
        cotizacionId: id,
        facturaId: note.id,
        folioFactura: note.folio_cliente,
      };
    });
    this.dashboardEvents.notifyUpdate();
    return result;
  }

  async searchProducts(search: string, limit = 10) {
    const term = search.trim();
    if (!term) return [];
    const products = await this.dataSource
      .getRepository(Producto)
      .createQueryBuilder('p')
      .where('p.activo=1')
      .andWhere(
        '(LOWER(p.codigo) LIKE :term OR LOWER(p.descripcion) LIKE :term)',
        { term: `%${term.toLocaleLowerCase('es-MX')}%` },
      )
      .orderBy('CASE WHEN LOWER(p.codigo)=:exact THEN 0 ELSE 1 END', 'ASC')
      .addOrderBy('p.codigo', 'ASC')
      .setParameter('exact', term.toLocaleLowerCase('es-MX'))
      .limit(limit)
      .getMany();
    if (!products.length) return [];
    const withImages = await this.dataSource.getRepository(Producto).find({
      where: { id: In(products.map((product) => product.id)) },
      relations: { imagenes: true },
    });
    const byId = new Map(withImages.map((product) => [product.id, product]));
    return products.map((product) => byId.get(product.id) || product);
  }

  private publicUser(user: Usuario) {
    return {
      id: user.id,
      nombre: [user.Nombre, user.Apellido_p, user.Apellido_m]
        .filter(Boolean)
        .join(' '),
      email: user.email,
      calle: user.Calle || '',
      numeroExterior: user.num_exterior || '',
      numeroInterior: user.num_interior || '',
      colonia: user.colonia || '',
      poblacion: user.poblacion || '',
      codigoPostalUsuario: user.cp || '',
      datosFiscales: user.datosFiscales || null,
    };
  }
  async searchClients(search: string, limit = 10) {
    const term = search.trim();
    if (term.length < 4) return [];
    const users = await this.dataSource
      .getRepository(Usuario)
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.datosFiscales', 'f')
      .where('u.estatus=1')
      .andWhere('LOWER(u.identidad)=:identity', { identity: 'cliente' })
      .andWhere(
        '(u.Nombre LIKE :term OR f.razonSocial LIKE :term OR f.rfc LIKE :term)',
        { term: `%${term}%` },
      )
      .take(limit)
      .getMany();
    return users.map((u) => this.publicUser(u));
  }
  async searchSellers(search: string, limit = 10) {
    const term = search.trim();
    if (term.length < 4) return [];
    const users = await this.dataSource
      .getRepository(Usuario)
      .createQueryBuilder('u')
      .where('u.estatus=1')
      .andWhere("LOWER(COALESCE(u.identidad,''))<>'cliente'")
      .andWhere('(u.Nombre LIKE :term OR u.email LIKE :term)', {
        term: `%${term}%`,
      })
      .take(limit)
      .getMany();
    return users.map((u) => this.publicUser(u));
  }
}
