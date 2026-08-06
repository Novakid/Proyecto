import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Producto } from '../../../productos/entities/producto.entity';
import { Usuario } from '../../entities/usuario.entity';

@Entity('clientes_precios_especiales')
@Index('UQ_cliente_precio_producto', ['clienteId', 'productoId'], {
  unique: true,
})
@Index('IDX_cliente_precio_cliente', ['clienteId'])
@Index('IDX_cliente_precio_producto', ['productoId'])
export class ClientePrecioEspecial {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'id_usuario', type: 'int' })
  clienteId!: number;

  @ManyToOne(() => Usuario, (usuario) => usuario.preciosEspeciales, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'id_usuario' })
  cliente!: Usuario;

  @Column({ name: 'id_producto', type: 'int' })
  productoId!: number;

  @ManyToOne(() => Producto, (producto) => producto.preciosEspeciales, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'id_producto' })
  producto!: Producto;

  @Column({ name: 'precio', type: 'decimal', precision: 12, scale: 2 })
  precioEspecial!: string;

  @Column({ type: 'int', default: 1 })
  estatus!: number;

  @Column({ name: 'id_empleado', type: 'int' })
  empleadoId!: number;

  @ManyToOne(() => Usuario, (usuario) => usuario.preciosEspecialesGestionados, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'id_empleado' })
  empleado!: Usuario;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamp' })
  fechaCreacion!: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'timestamp' })
  fechaActualizacion!: Date;
}
