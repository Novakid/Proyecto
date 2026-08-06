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
  };
  const productoRepo = { createQueryBuilder: jest.fn(() => queryBuilder), save: jest.fn() };
  const notaRepo = { create: jest.fn((value) => value), save: jest.fn() };
  const detalleRepo = { create: jest.fn((value) => value), save: jest.fn() };
  const manager = { getRepository: jest.fn((entity) => {
    if (entity === Producto) return productoRepo;
    if (entity === NotaPago) return notaRepo;
    return detalleRepo;
  }) };
  const dataSource = { transaction: jest.fn((callback) => callback(manager)) } as unknown as DataSource;
  const service = new FacturasService(dataSource);
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
  });

  it('rechaza stock insuficiente antes de guardar la nota', async () => {
    await expect(service.create({ ...dto, conceptos: [{ producto_id: 1, cantidad: 11, descuento: 0 }] }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(notaRepo.save).not.toHaveBeenCalled();
  });
});
