import { DataSource } from 'typeorm';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  it('usa timbrado como fuente de verdad y mantiene cancelacion independiente', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce([{ ventasHoy: '200.00', facturasHoy: '4', pendientesHoy: '1' }])
      .mockResolvedValueOnce([{ id: 1, cliente: 'QA A', fecha: new Date('2026-08-07') }])
      .mockResolvedValueOnce([]);
    const service = new DashboardService({ query } as unknown as DataSource);

    await expect(service.getSummary()).resolves.toMatchObject({
      ventasHoy: 200,
      facturasHoy: 4,
      pendientesHoy: 1,
      facturasPendientes: [{ id: 1, cliente: 'QA A', estatus: 'Pendiente' }],
    });

    const totalsSql = query.mock.calls[0][0] as string;
    const pendingSql = query.mock.calls[1][0] as string;
    expect(totalsSql).toContain('COALESCE(timbrado, 0) = 1');
    expect(totalsSql).toContain('fecha_cancelado IS NULL');
    expect(totalsSql).toContain('DATE(fecha_emision) = CURDATE()');
    expect(totalsSql).toContain('COALESCE(timbrado, 0) = 0');
    expect(pendingSql).toContain('COALESCE(timbrado, 0) = 0');
    expect(pendingSql).not.toContain('uuid');
  });
});
