import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { CotizacionDetalle } from './cotizacion-detalle.entity';

export enum EstadoCotizacion {
  PENDIENTE = 0,
  PROCESADA = 1,
  CANCELADA = 2,
}

@Entity('cotizaciones')
export class Cotizacion {
  @PrimaryGeneratedColumn() id!: number;
  @Column({
    name: 'folio_cotizacion',
    type: 'varchar',
    length: 100,
    unique: true,
  })
  folioCotizacion!: string;
  @Column({
    name: 'folio_especial',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  folioEspecial!: string | null;
  @Column({ name: 'id_cliente', type: 'int', nullable: true }) clienteId!:
    | number
    | null;
  @Column({ name: 'id_vendedor', type: 'int', nullable: true }) vendedorId!:
    | number
    | null;
  @Column({ name: 'creado_por_usuario_id', type: 'int', nullable: true })
  creadoPorUsuarioId!: number | null;
  @Column({ name: 'metodo_pago', type: 'varchar', length: 100, nullable: true })
  metodoPago!: string | null;
  @Column({ type: 'tinyint', default: 0 }) credito!: number;
  @Column({ type: 'varchar', length: 100, nullable: true }) almacen!:
    | string
    | null;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal!: number;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  descuento!: number;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  iva!: number;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total!: number;
  @Column({
    name: 'datos_fiscales_snapshot',
    type: 'simple-json',
    nullable: true,
  })
  datosFiscalesSnapshot!: Record<string, unknown> | null;
  @Column({ type: 'text', nullable: true }) observaciones!: string | null;
  @Column({ type: 'int', default: EstadoCotizacion.PENDIENTE })
  solicitada!: EstadoCotizacion;
  @Column({
    name: 'fecha_cotizacion',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCotizacion!: Date;
  @Column({ name: 'fecha_vigencia', type: 'date', nullable: true })
  fechaVigencia!: Date | null;
  @Column({ name: 'fecha_entrega', type: 'date', nullable: true })
  fechaEntrega!: Date | null;
  @Column({ name: 'fecha_solicitada', type: 'timestamp', nullable: true })
  fechaSolicitada!: Date | null;
  @Column({ name: 'fecha_cancelada', type: 'timestamp', nullable: true })
  fechaCancelada!: Date | null;
  @Column({ name: 'fecha_reactivada', type: 'timestamp', nullable: true })
  fechaReactivada!: Date | null;
  @OneToMany(() => CotizacionDetalle, (detail) => detail.cotizacion, {
    cascade: true,
  })
  detalles!: CotizacionDetalle[];
}
