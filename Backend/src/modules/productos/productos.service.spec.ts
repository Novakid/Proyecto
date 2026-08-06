import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ProductosService } from './productos.service';
import { Producto } from './entities/producto.entity';
import { ProductoImagen } from './entities/ProductoImagen.entity';
import { Tipo } from '../tipos/entities/tipo.entity';

describe('ProductosService', () => {
  let service: ProductosService;
  const dataSource = { transaction: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductosService,
        { provide: getRepositoryToken(Producto), useValue: {} },
        { provide: getRepositoryToken(ProductoImagen), useValue: {} },
        { provide: getRepositoryToken(Tipo), useValue: {} },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = module.get(ProductosService);
  });

  it('rechaza tipos inexistentes sin guardar el producto', async () => {
    const productoRepo = { create: jest.fn(), save: jest.fn() };
    const tipoRepo = { findBy: jest.fn().mockResolvedValue([{ id: 1 }]) };
    const manager = {
      getRepository: jest.fn((entity) => entity === Tipo ? tipoRepo : productoRepo),
    };
    dataSource.transaction.mockImplementation((callback) => callback(manager));

    await expect(service.create({
      codigo: 'P-1', descripcion: 'Producto', stock: 0, existencia: 1,
      precio: 10, nuevo: true, activo: true, tipos: [1, 2],
    }, [])).rejects.toBeInstanceOf(BadRequestException);
    expect(productoRepo.save).not.toHaveBeenCalled();
  });
});
