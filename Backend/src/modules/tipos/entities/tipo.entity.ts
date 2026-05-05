import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany
} from 'typeorm';
import { TipoImagen } from './tipo-imagen.entity';
import { Producto } from '../../productos/entities/producto.entity';
@Entity('tipos')
export class Tipo {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  nombre!: string;

  @Column({ nullable: true })
  descripcion!: string;

  @Column({ default: true })
  activo!: boolean;

  @Column({ type: 'timestamp', name: 'createdAt' })
  fecha!: Date;

  @OneToMany(() => TipoImagen, (img) => img.tipo, {
    cascade: true,
  })
  imagenes!: TipoImagen[];

  @ManyToMany(() => Producto, (producto) => producto.tipos)
  productos!: Producto[];
}