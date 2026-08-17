import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('roles')
export class Rol {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ length: 100, unique: true }) clave!: string;
  @Column({ length: 100, unique: true }) nombre!: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) descripcion!:
    | string
    | null;
  @Column({ type: 'tinyint', unsigned: true, default: 1 }) activo!: number;
  @Column({ name: 'es_sistema', type: 'tinyint', unsigned: true, default: 1 })
  esSistema!: number;
  @Column({ type: 'tinyint', unsigned: true, default: 1 }) asignable!: number;
}
