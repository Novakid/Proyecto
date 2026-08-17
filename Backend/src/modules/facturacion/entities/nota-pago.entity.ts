import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { HistorialCompra } from './historial-compra.entity';

@Entity('notas_de_pago')
export class NotaPago {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: true })
  cfdi!: string;

  @Column({ nullable: true })
  uuid!: string;

  @Column({ nullable: true })
  tfd!: string;

  @Column({ nullable: true })
  xml!: string;

  @Column({ nullable: true })
  metodo_pago!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fecha_emision!: Date;

  @Column({ type: 'timestamp', nullable: true })
  fecha_timbrado!: Date;

  @Column({ name: 'timbrado', type: 'tinyint', nullable: false, default: 0 })
  timbrada!: number;

  @Column({
    name: 'datos_fiscales_snapshot',
    type: 'simple-json',
    nullable: true,
  })
  datosFiscalesSnapshot!: Record<string, unknown> | null;

  @Column({ type: 'timestamp', nullable: true })
  fecha_cancelado!: Date;

  @Column({ type: 'varchar', length: 100, nullable: false })
  folio_cliente!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  folio_especial!: string | null;

  @Column({ type: 'int', nullable: true })
  id_cliente!: number | null;

  @Column({ nullable: true })
  vendedor!: string;

  @Column({ nullable: true })
  almacen!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  subtotal!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  descuento!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  total!: number;

  @Column({ nullable: true })
  razon_social!: string;

  @Column({ nullable: true })
  rfc!: string;

  @Column({ nullable: true })
  direccion!: string;

  @Column({ nullable: true })
  poblacion!: string;

  @Column({ nullable: true })
  colonia!: string;

  @Column({ type: 'date', nullable: true })
  fecha_entrega!: Date;

  @Column({ nullable: true })
  operador!: string;

  @Column({ nullable: true })
  credito!: number;

  @Column({ name: 'creado_por_usuario_id', type: 'int', nullable: true })
  creadoPorUsuarioId!: number | null;

  @OneToMany(() => HistorialCompra, (detalle) => detalle.factura, {
    cascade: true,
  })
  detalles!: HistorialCompra[];
}
