import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from './usuario.entity';

export enum TipoPersonaFiscal {
  FISICA = 'fisica',
  MORAL = 'moral',
}

@Entity('clientes_datos')
@Index('uq_clientes_datos_usuario', ['idUsuario'], { unique: true })
@Index('idx_clientes_datos_rfc', ['rfc'])
export class ClienteDatos {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'id_usuario', type: 'int' })
  idUsuario!: number;

  @Column({ name: 'tipo_persona', type: 'enum', enum: TipoPersonaFiscal })
  tipoPersona!: TipoPersonaFiscal;

  @Column({ type: 'varchar', length: 13 })
  rfc!: string;

  @Column({ name: 'razon_social', type: 'varchar', length: 254 })
  razonSocial!: string;

  @Column({ name: 'codigo_postal', type: 'char', length: 5 })
  codigoPostal!: string;

  @Column({ name: 'regimen_fiscal', type: 'varchar', length: 3 })
  regimenFiscal!: string;

  @Column({ name: 'uso_cfdi', type: 'varchar', length: 3 })
  usoCfdi!: string;

  @Column({ type: 'varchar', length: 191 })
  correo!: string;

  @Column({ type: 'varchar', length: 20 })
  telefono!: string;

  @Column({
    name: 'es_extranjero',
    type: 'tinyint',
    unsigned: true,
    default: 2,
  })
  esExtranjero!: number;

  @Column({
    name: 'residencia_fiscal',
    type: 'char',
    length: 3,
    nullable: true,
  })
  residenciaFiscal!: string | null;

  @Column({
    name: 'num_reg_id_trib',
    type: 'varchar',
    length: 40,
    nullable: true,
  })
  numRegIdTrib!: string | null;

  @Column({
    name: 'fecha_creacion',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCreacion!: Date;

  @Column({
    name: 'fecha_actualizacion',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  fechaActualizacion!: Date;

  @OneToOne(() => Usuario, (usuario) => usuario.datosFiscales, {
    onDelete: 'NO ACTION',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'id_usuario', referencedColumnName: 'id' })
  usuario!: Usuario;
}
