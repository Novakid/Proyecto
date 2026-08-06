import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { NotaPago } from './nota-pago.entity';
import { Producto } from '../../productos/entities/producto.entity';

@Entity('historial_compras')
export class HistorialCompra {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: true })
  id_catalogo!: number;

  @Column()
  cantidad!: number;

  @Column('decimal', { precision: 12, scale: 2 })
  precio_unitario!: number;

  @Column('decimal', { precision: 12, scale: 2 })
  monto_sin_iva!: number;

  @Column('decimal', { precision: 12, scale: 2 })
  monto_iva!: number;

  @Column('decimal', { precision: 12, scale: 2 })
  monto_total!: number;

  @ManyToOne(() => NotaPago, (factura) => factura.detalles)
  @JoinColumn({ name: 'id_folio' })
  factura!: NotaPago;

  @ManyToOne(() => Producto)
  @JoinColumn({ name: 'id_catalogo' })
  producto!: Producto;
}
