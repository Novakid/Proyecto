import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DashboardService {
  constructor(private readonly dataSource: DataSource) {}

  async getSummary() {
    const [totals, pendingInvoices, lowStock] = await Promise.all([
      this.dataSource.query(`
        SELECT
          COALESCE(SUM(CASE
            WHEN fecha_cancelado IS NULL
              AND COALESCE(timbrado, 0) = 1
              AND DATE(fecha_timbrado) = CURDATE()
            THEN total ELSE 0 END), 0) AS ventasHoy,
          SUM(CASE WHEN DATE(fecha_emision) = CURDATE() THEN 1 ELSE 0 END) AS facturasHoy,
          SUM(CASE
            WHEN DATE(fecha_emision) = CURDATE()
              AND fecha_cancelado IS NULL
              AND COALESCE(timbrado, 0) = 0
            THEN 1 ELSE 0 END) AS pendientesHoy
        FROM notas_de_pago
      `) as Promise<Array<{ ventasHoy: string; facturasHoy: string; pendientesHoy: string }>>,
      this.dataSource.query(`
        SELECT id, COALESCE(NULLIF(razon_social, ''), 'Cliente sin nombre') AS cliente,
          fecha_emision AS fecha
        FROM notas_de_pago
        WHERE DATE(fecha_emision) = CURDATE()
          AND fecha_cancelado IS NULL
          AND COALESCE(timbrado, 0) = 0
        ORDER BY fecha_emision DESC, id DESC
        LIMIT 5
      `) as Promise<Array<{ id: number; cliente: string; fecha: Date }>>,
      this.dataSource.query(`
        SELECT id, COALESCE(NULLIF(descripcion, ''), NULLIF(codigo, ''), 'Producto sin descripción') AS descripcion,
          existencia
        FROM catalogo
        WHERE activo = 1 AND existencia < 5
        ORDER BY existencia ASC, descripcion ASC
        LIMIT 5
      `) as Promise<Array<{ id: number; descripcion: string; existencia: number }>>,
    ]);
    const aggregate = totals[0] ?? { ventasHoy: '0', facturasHoy: '0', pendientesHoy: '0' };
    return {
      ventasHoy: Number(aggregate.ventasHoy ?? 0),
      facturasHoy: Number(aggregate.facturasHoy ?? 0),
      pendientesHoy: Number(aggregate.pendientesHoy ?? 0),
      facturasPendientes: pendingInvoices.map((item) => ({ ...item, estatus: 'Pendiente' })),
      stockBajo: lowStock.map((item) => ({ ...item, existencia: Number(item.existencia) })),
    };
  }
}
