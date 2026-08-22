import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cotizacion } from './cotizacion.entity';

@Entity('cotizacion_detalles')
export class CotizacionDetalle {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ name: 'id_cotizacion', type: 'int' }) cotizacionId!: number;
  @Column({ name: 'id_catalogo', type: 'int', nullable: true }) productoId!:
    | number
    | null;
  @Column({
    name: 'codigo_producto',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  codigoProducto!: string | null;
  @Column({ name: 'nombre_producto', type: 'varchar', length: 255 })
  nombreProducto!: string;
  @Column({ type: 'int' }) cantidad!: number;
  @Column({ name: 'precio_unitario', type: 'decimal', precision: 12, scale: 2 })
  precioUnitario!: number;
  @Column({
    name: 'precio_original',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  precioOriginal!: number | null;
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  descuento!: number;
  @Column({
    name: 'monto_descuento',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  montoDescuento!: number;
  @Column({ name: 'monto_sin_iva', type: 'decimal', precision: 12, scale: 2 })
  montoSinIva!: number;
  @Column({ name: 'monto_iva', type: 'decimal', precision: 12, scale: 2 })
  montoIva!: number;
  @Column({ name: 'monto_total', type: 'decimal', precision: 12, scale: 2 })
  montoTotal!: number;
  @Column({ type: 'int', default: 0 }) redem!: number;
  @ManyToOne(() => Cotizacion, (quote) => quote.detalles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_cotizacion' })
  cotizacion!: Cotizacion;
}
