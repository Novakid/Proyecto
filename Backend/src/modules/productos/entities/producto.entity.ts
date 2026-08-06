import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { ProductoImagen } from './ProductoImagen.entity';
import { Tipo } from '../../tipos/entities/tipo.entity';
import { ClientePrecioEspecial } from '../../usuarios/precios-especiales/entities/cliente-precio-especial.entity';

@Entity('catalogo')
export class Producto {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 50 })
  codigo!: string;

  @Column('text')
  descripcion!: string;

  @Column('int')
  stock!: number;

  @Column('int')
  existencia!: number;

  @Column('decimal', { precision: 10, scale: 2 })
  precio!: number;

  @Column({ type: 'boolean', name: 'nuevo' })
  nuevo!: boolean;

  @Column({ type: 'boolean', name: 'activo' })
  activo!: boolean;

  @Column('int')
  almacen!: number;

  @Column('int')
  piso!: number;

  @Column({ type: 'timestamp', name: 'fecha_ingreso' })
  fechaIngreso!: Date;

  @OneToMany(() => ProductoImagen, (img) => img.producto)
  imagenes!: ProductoImagen[];

  @ManyToMany(() => Tipo, (tipo) => tipo.productos)
  @JoinTable({
    name: 'producto_tipos',
    joinColumn: { name: 'producto_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tipo_id', referencedColumnName: 'id' },
  })
  tipos!: Tipo[];

  @OneToMany(() => ClientePrecioEspecial, (precio) => precio.producto)
  preciosEspeciales!: ClientePrecioEspecial[];
}
