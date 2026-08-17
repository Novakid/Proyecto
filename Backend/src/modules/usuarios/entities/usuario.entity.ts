import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { UserRole } from '../../auth/auth.types';
import { ClientePrecioEspecial } from '../precios-especiales/entities/cliente-precio-especial.entity';
import { ClienteDatos } from './cliente-datos.entity';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100 })
  Nombre!: string;

  @Column({ nullable: true, length: 100 })
  Apellido_p!: string;

  @Column({ nullable: true, length: 100 })
  Apellido_m!: string;

  @Column({ nullable: true, length: 150 })
  Calle!: string;

  @Column({ nullable: true, length: 20 })
  num_interior!: string;

  @Column({ nullable: true, length: 20 })
  num_exterior!: string;

  @Column({ nullable: true, length: 100 })
  poblacion!: string;

  @Column({ nullable: true, length: 10 })
  cp!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  descuento!: number;

  @Column({ nullable: true, length: 20 })
  rfc!: string;

  @Column({ default: 1 })
  estatus!: number;

  @Column({ nullable: true, length: 100 })
  colonia!: string;

  @Column({ nullable: true, length: 50 })
  identidad!: string;

  @Column({ type: 'timestamp', nullable: true })
  fecha_creacion!: Date;

  @Column({ type: 'varchar', nullable: true, unique: true, length: 191 })
  email!: string | null;

  @Column({
    type: 'varchar',
    name: 'password_hash',
    nullable: true,
    select: false,
    length: 255,
  })
  passwordHash!: string | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.EMPLOYEE })
  role!: UserRole;

  @Column({
    name: 'tipo_usuario',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  tipoUsuario!: string | null;

  @Column({
    name: 'canal_acceso',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  canalAcceso!: string | null;

  @Column({ name: 'estatus_acceso', type: 'int', nullable: true })
  estatusAcceso!: number | null;

  @Column({
    name: 'authz_version',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  authzVersion!: string | null;

  @OneToOne(() => ClienteDatos, (datos) => datos.usuario)
  datosFiscales!: ClienteDatos | null;

  @OneToMany(() => ClientePrecioEspecial, (precio) => precio.cliente)
  preciosEspeciales!: ClientePrecioEspecial[];

  @OneToMany(() => ClientePrecioEspecial, (precio) => precio.empleado)
  preciosEspecialesGestionados!: ClientePrecioEspecial[];
}
