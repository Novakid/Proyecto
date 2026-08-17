import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FacturasService } from './facturacion.service';
import { Producto } from '../productos/entities/producto.entity';
import { NotaPago } from './entities/nota-pago.entity';
import { CreateFacturaDto } from './dto/create-factura.dto';
import { Usuario } from '../usuarios/entities/usuario.entity';

describe('FacturasService', () => {
  let folioSequence = 0;
  const producto = {
    id: 1,
    codigo: 'P-1',
    activo: true,
    existencia: 10,
    precio: 100,
  } as Producto;
  const queryBuilder = {
    setLock: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
  };
  const productoRepo = {
    createQueryBuilder: jest.fn(() => queryBuilder),
    save: jest.fn(),
  };
  const notaRepo = {
    create: jest.fn((value) => value),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => queryBuilder),
  };
  const detalleRepo = { create: jest.fn((value) => value), save: jest.fn() };
  const usuarioRepo = { findOne: jest.fn() };
  const manager = {
    query: jest.fn(async (sql: string) => {
      if (sql.includes('INSERT INTO factura_folio_consecutivos')) {
        folioSequence += 1;
        return [];
      }
      if (sql.includes('LAST_INSERT_ID()'))
        return [{ consecutivo: folioSequence }];
      return [];
    }),
    getRepository: jest.fn((entity) => {
      if (entity === Producto) return productoRepo;
      if (entity === NotaPago) return notaRepo;
      if (entity === Usuario) return usuarioRepo;
      return detalleRepo;
    }),
  };
  const transaction = jest.fn((callback) => callback(manager));
  const dataSource = { transaction } as unknown as DataSource;
  const dashboardEvents = { notifyUpdate: jest.fn() };
  const service = new FacturasService(dataSource, dashboardEvents as never);
  const dto: CreateFacturaDto = {
    clienteId: 2,
    vendedor: 'Admin',
    almacen: 'Principal',
    cliente: {
      nombre: 'Cliente',
      rfc: 'XAXX010101000',
      direccion: 'Calle',
      colonia: 'Centro',
      poblacion: 'Ciudad',
      fechaEntrega: '2026-08-04',
      operador: 'Admin',
      credito: false,
    },
    conceptos: [{ producto_id: 1, cantidad: 2, descuento: 10 }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    folioSequence = 0;
    transaction.mockImplementation((callback) => callback(manager));
    producto.existencia = 10;
    queryBuilder.getMany.mockResolvedValue([producto]);
    notaRepo.save.mockImplementation(async (value) => ({ ...value, id: 7 }));
    usuarioRepo.findOne.mockResolvedValue({
      id: 2,
      estatus: 1,
      identidad: 'cliente',
      datosFiscales: {
        tipoPersona: 'fisica',
        rfc: 'XAXX010101000',
        razonSocial: 'Cliente Fiscal',
        codigoPostal: '06000',
        regimenFiscal: '612',
        usoCfdi: 'G03',
        correo: 'cliente@ejemplo.com',
        telefono: '5555555555',
        esExtranjero: 2,
        residenciaFiscal: null,
        numRegIdTrib: null,
      },
    });
    detalleRepo.save.mockResolvedValue([]);
    productoRepo.save.mockResolvedValue([]);
  });

  it('recalcula totales y descuenta inventario dentro de la transaccion', async () => {
    const result = await service.create(dto, 55);
    expect(result).toMatchObject({
      folio_cliente: expect.stringMatching(/^FAC-\d{4}-000001$/),
      subtotal: 200,
      descuento: 20,
      iva: 28.8,
      total: 208.8,
    });
    expect(producto.existencia).toBe(8);
    expect(detalleRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ precio_unitario: 100, monto_total: 208.8 }),
    );
    expect(notaRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        folio_cliente: expect.stringMatching(/^FAC-\d{4}-000001$/),
        folio_especial: null,
        timbrada: 0,
        creadoPorUsuarioId: 55,
      }),
    );
    expect(dashboardEvents.notifyUpdate).toHaveBeenCalledTimes(1);
  });

  it('normaliza el folio especial y genera folios distintos', async () => {
    const first = await service.create({ ...dto, folioEspecial: '  EXT-25  ' });
    producto.existencia = 10;
    const second = await service.create({ ...dto, folioEspecial: '   ' });

    expect(first).toMatchObject({ folio_especial: 'EXT-25' });
    expect(second).toMatchObject({ folio_especial: null });
    expect(first.folio_cliente).not.toBe(second.folio_cliente);
  });

  it('genera folios distintos ante creaciones simultáneas', async () => {
    producto.existencia = 100;
    let allocated = 0;
    transaction.mockImplementation(async (callback) => {
      let localSequence = 0;
      const isolatedManager = {
        ...manager,
        query: jest.fn(async (sql: string) => {
          if (sql.includes('INSERT INTO factura_folio_consecutivos')) {
            localSequence = ++allocated;
            return [];
          }
          if (sql.includes('LAST_INSERT_ID()'))
            return [{ consecutivo: localSequence }];
          return [];
        }),
      };
      return callback(isolatedManager);
    });
    const results = await Promise.all(
      Array.from({ length: 5 }, () => service.create(dto)),
    );
    const folios = results.map((result) => result.folio_cliente);

    expect(new Set(folios).size).toBe(5);
    expect(folios).toEqual(
      expect.arrayContaining([expect.stringMatching(/^FAC-\d{4}-\d{6}$/)]),
    );
  });

  it('rechaza stock insuficiente antes de guardar la nota', async () => {
    await expect(
      service.create({
        ...dto,
        conceptos: [{ producto_id: 1, cantidad: 11, descuento: 0 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(notaRepo.save).not.toHaveBeenCalled();
    expect(dashboardEvents.notifyUpdate).not.toHaveBeenCalled();
  });

  it('no notifica ni continúa cuando falla el guardado de conceptos', async () => {
    detalleRepo.save.mockRejectedValueOnce(new Error('Fallo de conceptos'));

    await expect(service.create(dto)).rejects.toThrow('Fallo de conceptos');
    expect(notaRepo.save).toHaveBeenCalledTimes(1);
    expect(productoRepo.save).not.toHaveBeenCalled();
    expect(dashboardEvents.notifyUpdate).not.toHaveBeenCalled();
  });

  it('marca una factura válida como timbrada y notifica al Dashboard', async () => {
    queryBuilder.getOne.mockResolvedValue({
      id: 8,
      folio_cliente: 'FAC-2026-000008',
      id_cliente: 2,
      datosFiscalesSnapshot: { rfc: 'XAXX010101000' },
      detalles: [{ id: 1 }],
      timbrada: 0,
      fecha_timbrado: null,
      fecha_cancelado: null,
    });
    notaRepo.save.mockImplementation(async (value) => value);

    await expect(service.timbrar(8)).resolves.toMatchObject({
      id: 8,
      timbrada: 1,
    });
    expect(notaRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ timbrada: 1 }),
    );
    expect(dashboardEvents.notifyUpdate).toHaveBeenCalledTimes(1);
  });

  it('es idempotente y conserva la fecha del primer timbrado', async () => {
    const originalDate = new Date('2026-08-17T12:00:00Z');
    queryBuilder.getOne.mockResolvedValue({
      id: 9,
      folio_cliente: 'FAC-2026-000009',
      id_cliente: 2,
      datosFiscalesSnapshot: { rfc: 'XAXX010101000' },
      detalles: [{ id: 1 }],
      timbrada: 1,
      fecha_timbrado: originalDate,
      fecha_cancelado: null,
    });

    await expect(service.timbrar(9)).resolves.toMatchObject({
      message: 'La factura ya se encuentra marcada como timbrada',
      fecha_timbrado: originalDate,
    });
    expect(notaRepo.save).not.toHaveBeenCalled();
    expect(dashboardEvents.notifyUpdate).not.toHaveBeenCalled();
  });
});
