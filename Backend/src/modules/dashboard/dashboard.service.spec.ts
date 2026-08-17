import { DataSource } from 'typeorm';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  it('usa entidades TypeORM, timbrado y cancelacion como fuentes de verdad', async () => {
    const today = new Date();
    const notas = [
      {
        id: 1,
        razon_social: 'QA A',
        fecha_emision: today,
        fecha_timbrado: null,
        fecha_cancelado: null,
        timbrada: 0,
        total: '100.00',
      },
      {
        id: 2,
        razon_social: 'QA B',
        fecha_emision: today,
        fecha_timbrado: today,
        fecha_cancelado: null,
        timbrada: 1,
        total: '200.00',
      },
      {
        id: 3,
        razon_social: 'QA C',
        fecha_emision: today,
        fecha_timbrado: today,
        fecha_cancelado: today,
        timbrada: 1,
        total: '300.00',
      },
    ];
    const productos = [
      { id: 4, codigo: 'P-4', descripcion: '', existencia: 2 },
    ];
    const notaQb = chainQueryBuilder(notas);
    const productoQb = chainQueryBuilder(productos);
    const getRepository = jest
      .fn()
      .mockReturnValueOnce({ createQueryBuilder: () => notaQb })
      .mockReturnValueOnce({ createQueryBuilder: () => productoQb });
    const service = new DashboardService({
      getRepository,
    } as unknown as DataSource);

    await expect(service.getSummary()).resolves.toMatchObject({
      ventasHoy: 200,
      facturasHoy: 3,
      pendientesHoy: 1,
      stockBajoTotal: 1,
      facturasPendientes: [{ id: 1, cliente: 'QA A', estatus: 'Pendiente' }],
      stockBajo: [{ id: 4, codigo: 'P-4', descripcion: 'P-4', existencia: 2 }],
    });
    expect(getRepository).toHaveBeenCalledTimes(2);
  });
});

function chainQueryBuilder(result: unknown[]) {
  const builder = {
    where: jest.fn(),
    orWhere: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    take: jest.fn(),
    getMany: jest.fn().mockResolvedValue(result),
    getManyAndCount: jest.fn().mockResolvedValue([result, result.length]),
  };
  for (const method of [
    'where',
    'orWhere',
    'andWhere',
    'orderBy',
    'addOrderBy',
    'take',
  ] as const) {
    builder[method].mockReturnValue(builder);
  }
  return builder;
}
