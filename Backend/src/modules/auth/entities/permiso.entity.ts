import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('permisos')
@Index('IDX_permisos_modulo', ['modulo'])
export class Permiso {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ length: 100, unique: true }) clave!: string;
  @Column({ length: 100 }) modulo!: string;
  @Column({ length: 100 }) accion!: string;
  @Column({ type: 'tinyint', unsigned: true, default: 1 }) activo!: number;
}
