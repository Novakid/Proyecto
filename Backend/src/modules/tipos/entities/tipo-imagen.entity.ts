import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tipo } from './tipo.entity';
@Entity('tipo_imagenes')
export class TipoImagen {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  url!: string;

  @ManyToOne(() => Tipo, (tipo) => tipo.imagenes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tipo_id' })
  tipo!: Tipo;
}