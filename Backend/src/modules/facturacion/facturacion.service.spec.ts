import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FacturasService } from './facturacion.service';
import { Producto } from '../productos/entities/producto.entity';
import { NotaPago } from './entities/nota-pago.entity';
import { HistorialCompra } from './entities/historial-compra.entity';
import { CreateFacturaDto } from './dto/create-factura.dto';

describe('FacturasService', () => {
  const producto = { id: 1, codigo: 'P-1', activo: true, existencia: 10, precio: 100 } as Producto;
  const queryBuilder = {
    setLock: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
  };
  const productoRepo = { createQueryBuilder: jest.fn(() => queryBuilder), save: jest.fn() };
  const notaRepo = { create: jest.fn((value) => value), save: jest.fn(), createQueryBuilder: jest.fn(() => queryBuilder) };
  const detalleRepo = { create: jest.fn((value) => value), save: jest.fn() };
  const manager = { getRepository: jest.fn((entity) => {
    if (entity === Producto) return productoRepo;
    if (entity === NotaPago) return notaRepo;
    return detalleRepo;
  }) };
  const dataSource = { transaction: jest.fn((callback) => callback(manager)) } as unknown as DataSource;
  const dashboardEvents = { notifyUpdate: jest.fn() };
  const service = new FacturasService(dataSource, dashboardEvents as never);
  const dto: CreateFacturaDto = {
    folio: 'F-1', vendedor: 'Admin', almacen: 'Principal',
    cliente: { nombre: 'Cliente', rfc: 'XAXX010101000', direccion: 'Calle', colonia: 'Centro', poblacion: 'Ciudad', fechaEntrega: '2026-08-04', operador: 'Admin', credito: false },
    conceptos: [{ producto_id: 1, cantidad: 2, descuento: 10 }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    producto.existencia = 10;
    queryBuilder.getMany.mockResolvedValue([producto]);
    notaRepo.save.mockImplementation(async (value) => ({ ...value, id: 7 }));
    detalleRepo.save.mockResolvedValue([]);
    productoRepo.save.mockResolvedValue([]);
  });

  it('recalcula totales y descuenta inventario dentro de la transaccion', async () => {
    const result = await service.create(dto);
    expect(result).toMatchObject({ subtotal: 200, descuento: 20, iva: 28.8, total: 208.8 });
    expect(producto.existencia).toBe(8);
    expect(detalleRepo.create).toHaveBeenCalledWith(expect.objectContaining({ precio_unitario: 100, monto_total: 208.8 }));
    expect(notaRepo.create).toHaveBeenCalledWith(expect.objectContaining({ timbrada: 0 }));
    expect(dashboardEvents.notifyUpdate).toHaveBeenCalledTimes(1);
  });

  it('rechaza stock insuficiente antes de guardar la nota', async () => {
    await expect(service.create({ ...dto, conceptos: [{ producto_id: 1, cantidad: 11, descuento: 0 }] }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(notaRepo.save).not.toHaveBeenCalled();
    expect(dashboardEvents.notifyUpdate).not.toHaveBeenCalled();
  });

  it('simula timbrado solo para una factura QA y notifica al Dashboard', async () => {
    queryBuilder.getOne.mockResolvedValue({
      id: 8,
      folio_cliente: 'QA_TEST_FACTURA_8',
      timbrada: 0,
      fecha_timbrado: null,
      fecha_cancelado: null,
    });
    notaRepo.save.mockImplementation(async (value) => value);

    await expect(service.simularTimbradoQa(8)).resolves.toMatchObject({ id: 8, timbrada: 1 });
    expect(notaRepo.save).toHaveBeenCalledWith(expect.objectContaining({ timbrada: 1 }));
    expect(dashboardEvents.notifyUpdate).toHaveBeenCalledTimes(1);
  });

  it('rechaza la simulacion para facturas que no son QA', async () => {
    queryBuilder.getOne.mockResolvedValue({
      id: 9,
      folio_cliente: 'FACTURA_REAL_9',
      timbrada: 0,
      fecha_cancelado: null,
    });

    await expect(service.simularTimbradoQa(9)).rejects.toBeInstanceOf(BadRequestException);
    expect(dashboardEvents.notifyUpdate).not.toHaveBeenCalled();
  });
});
