import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { NotaPago } from './entities/nota-pago.entity';
import { HistorialCompra } from './entities/historial-compra.entity';
import { CreateFacturaDto } from './dto/create-factura.dto';
import { Producto } from '../productos/entities/producto.entity';

const roundMoney = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

@Injectable()
export class FacturasService {
  constructor(private readonly dataSource: DataSource) {}

  async create(data: CreateFacturaDto) {
    return this.dataSource.transaction(async (manager) => {
      const productoRepo = manager.getRepository(Producto);
      const notaRepo = manager.getRepository(NotaPago);
      const detalleRepo = manager.getRepository(HistorialCompra);
      const requestedIds = [...new Set(data.conceptos.map((item) => item.producto_id))];
      const productos = await productoRepo
        .createQueryBuilder('producto')
        .setLock('pessimistic_write')
        .where({ id: In(requestedIds) })
        .getMany();

      if (productos.length !== requestedIds.length) {
        const foundIds = new Set(productos.map((producto) => producto.id));
        const missing = requestedIds.filter((id) => !foundIds.has(id));
        throw new NotFoundException(`Productos no encontrados: ${missing.join(', ')}`);
      }

      const productById = new Map(productos.map((producto) => [producto.id, producto]));
      let subtotal = 0;
      let descuento = 0;
      let iva = 0;

      const calculatedLines = data.conceptos.map((item) => {
        const producto = productById.get(item.producto_id)!;
        if (!producto.activo) throw new BadRequestException(`El producto ${producto.codigo} no esta activo`);
        if (item.cantidad > producto.existencia) {
          throw new BadRequestException(`Stock insuficiente para ${producto.codigo}. Disponible: ${producto.existencia}`);
        }
        const precioUnitario = Number(producto.precio);
        const importeBruto = roundMoney(precioUnitario * item.cantidad);
        const importeDescuento = roundMoney(importeBruto * (item.descuento / 100));
        const montoSinIva = roundMoney(importeBruto - importeDescuento);
        const montoIva = roundMoney(montoSinIva * 0.16);
        const montoTotal = roundMoney(montoSinIva + montoIva);
        subtotal = roundMoney(subtotal + importeBruto);
        descuento = roundMoney(descuento + importeDescuento);
        iva = roundMoney(iva + montoIva);
        producto.existencia -= item.cantidad;
        return { producto, item, precioUnitario, montoSinIva, montoIva, montoTotal };
      });

      const total = roundMoney(subtotal - descuento + iva);
      const nota = await notaRepo.save(notaRepo.create({
        folio_cliente: data.folio,
        fecha_emision: new Date(),
        vendedor: data.vendedor,
        almacen: data.almacen,
        subtotal,
        descuento,
        total,
        razon_social: data.cliente.nombre,
        rfc: data.cliente.rfc,
        direccion: data.cliente.direccion,
        colonia: data.cliente.colonia,
        poblacion: data.cliente.poblacion,
        fecha_entrega: new Date(`${data.cliente.fechaEntrega}T00:00:00`),
        operador: data.cliente.operador,
        credito: data.cliente.credito ? 1 : 0,
      }));

      await detalleRepo.save(calculatedLines.map(({ producto, item, precioUnitario, montoSinIva, montoIva, montoTotal }) =>
        detalleRepo.create({
          id_catalogo: producto.id,
          cantidad: item.cantidad,
          precio_unitario: precioUnitario,
          monto_sin_iva: montoSinIva,
          monto_iva: montoIva,
          monto_total: montoTotal,
          factura: nota,
          producto,
        }),
      ));
      await productoRepo.save(productos);
      return { message: 'Factura creada correctamente', id: nota.id, subtotal, descuento, iva, total };
    });
  }

  async findAll() {
    const notas = await this.dataSource.getRepository(NotaPago).find({
      relations: ['detalles'],
      order: { id: 'DESC' },
    });
    return {
      notas_de_pago: notas.map((nota) => ({
        ...nota,
        subtotal: Number(nota.subtotal ?? 0),
        descuento: Number(nota.descuento ?? 0),
        total: Number(nota.total ?? 0),
        conceptos: (nota.detalles ?? []).map((detalle) => ({
          id: detalle.id,
          cantidad: detalle.cantidad,
          precio_unitario: Number(detalle.precio_unitario),
          monto_sin_iva: Number(detalle.monto_sin_iva),
          monto_iva: Number(detalle.monto_iva),
          monto_total: Number(detalle.monto_total),
          id_catalogo: detalle.id_catalogo,
        })),
        detalles: undefined,
      })),
    };
  }
}
