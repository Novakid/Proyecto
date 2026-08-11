import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { NotaPago } from '../facturacion/entities/nota-pago.entity';
import { Producto } from '../productos/entities/producto.entity';

@Injectable()
export class DashboardService {
  constructor(private readonly dataSource: DataSource) {}

  async getSummary() {
    const notas = await this.dataSource
      .getRepository(NotaPago)
      .createQueryBuilder('nota')
      .where('DATE(nota.fecha_emision) = CURRENT_DATE()')
      .orWhere('DATE(nota.fecha_timbrado) = CURRENT_DATE()')
      .orderBy('nota.fecha_emision', 'DESC')
      .addOrderBy('nota.id', 'DESC')
      .getMany();

    const productos = await this.dataSource
      .getRepository(Producto)
      .createQueryBuilder('producto')
      .where('producto.activo = :activo', { activo: true })
      .andWhere('producto.existencia < :limite', { limite: 5 })
      .orderBy('producto.existencia', 'ASC')
      .addOrderBy('producto.descripcion', 'ASC')
      .take(5)
      .getMany();

    const emittedToday = notas.filter((nota) => this.isToday(nota.fecha_emision));
    const pendingInvoices = emittedToday
      .filter((nota) => !nota.fecha_cancelado && Number(nota.timbrada ?? 0) === 0)
      .slice(0, 5);
    const stampedToday = notas.filter(
      (nota) =>
        !nota.fecha_cancelado &&
        Number(nota.timbrada ?? 0) === 1 &&
        this.isToday(nota.fecha_timbrado),
    );

    return {
      ventasHoy: stampedToday.reduce((total, nota) => total + Number(nota.total ?? 0), 0),
      facturasHoy: emittedToday.length,
      pendientesHoy: pendingInvoices.length,
      facturasPendientes: pendingInvoices.map((nota) => ({
        id: nota.id,
        cliente: nota.razon_social?.trim() || 'Cliente sin nombre',
        fecha: nota.fecha_emision,
        estatus: 'Pendiente',
      })),
      stockBajo: productos.map((producto) => ({
        id: producto.id,
        descripcion: producto.descripcion?.trim() || producto.codigo?.trim() || 'Producto sin descripcion',
        existencia: Number(producto.existencia),
      })),
    };
  }

  private isToday(value: Date | null | undefined): boolean {
    if (!value) return false;
    const date = value instanceof Date ? value : new Date(value);
    const today = new Date();
    return date.getFullYear() === today.getFullYear()
      && date.getMonth() === today.getMonth()
      && date.getDate() === today.getDate();
  }
}
