import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableCheck,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

const CREATED_COMMENT = 'Creada por CreateOrHardenClientesDatos1786665600000';

export class CreateOrHardenClientesDatos1786665600000 implements MigrationInterface {
  name = 'CreateOrHardenClientesDatos1786665600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('clientes_datos'))) {
      await queryRunner.createTable(this.tableDefinition());
      return;
    }

    const table = await queryRunner.getTable('clientes_datos');
    if (!table) throw new Error('No fue posible inspeccionar clientes_datos');
    const requiredColumns = [
      'id',
      'id_usuario',
      'tipo_persona',
      'rfc',
      'razon_social',
      'codigo_postal',
      'regimen_fiscal',
      'uso_cfdi',
      'correo',
      'telefono',
      'es_extranjero',
      'residencia_fiscal',
      'num_reg_id_trib',
      'fecha_creacion',
      'fecha_actualizacion',
    ];
    const missing = requiredColumns.filter(
      (name) => !table.findColumnByName(name),
    );
    const rows = (await queryRunner.query(
      'SELECT COUNT(*) cantidad FROM clientes_datos',
    )) as unknown as Array<{ cantidad: string | number }>;
    if (missing.length || table.findColumnByName('id_usuario')?.isNullable) {
      if (Number(rows[0]?.cantidad ?? 0) > 0) {
        throw new Error(
          `clientes_datos contiene información y requiere adecuación manual previa: ${missing.join(', ') || 'id_usuario nullable'}`,
        );
      }
      throw new Error(
        `clientes_datos está vacía pero su estructura es antigua. Adecúela explícitamente antes de registrar esta migración: ${missing.join(', ') || 'id_usuario nullable'}`,
      );
    }

    const idUsuarioUnique = table.indices.some(
      (index) =>
        index.isUnique &&
        index.columnNames.length === 1 &&
        index.columnNames[0] === 'id_usuario',
    );
    if (!idUsuarioUnique)
      await queryRunner.createIndex(
        'clientes_datos',
        new TableIndex({
          name: 'uq_clientes_datos_usuario',
          columnNames: ['id_usuario'],
          isUnique: true,
        }),
      );
    const rfcIndex = table.indices.some(
      (index) =>
        index.columnNames.length === 1 && index.columnNames[0] === 'rfc',
    );
    if (!rfcIndex)
      await queryRunner.createIndex(
        'clientes_datos',
        new TableIndex({
          name: 'idx_clientes_datos_rfc',
          columnNames: ['rfc'],
        }),
      );
    if (
      !table.foreignKeys.some((foreignKey) =>
        foreignKey.columnNames.includes('id_usuario'),
      )
    ) {
      await queryRunner.createForeignKey(
        'clientes_datos',
        new TableForeignKey({
          name: 'fk_clientes_datos_usuario',
          columnNames: ['id_usuario'],
          referencedTableName: 'usuarios',
          referencedColumnNames: ['id'],
          onDelete: 'NO ACTION',
          onUpdate: 'CASCADE',
        }),
      );
    }
    const checks = (await queryRunner.query(
      `SELECT CONSTRAINT_NAME name FROM information_schema.TABLE_CONSTRAINTS
       WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='clientes_datos' AND CONSTRAINT_TYPE='CHECK'`,
    )) as unknown as Array<{ name: string }>;
    if (
      !checks.some(
        (check) => check.name.toLowerCase() === 'chk_clientes_datos_extranjero',
      )
    ) {
      await queryRunner.query(
        'ALTER TABLE clientes_datos ADD CONSTRAINT chk_clientes_datos_extranjero CHECK (es_extranjero IN (1,2))',
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('clientes_datos'))) return;
    const rows = (await queryRunner.query(
      `SELECT TABLE_COMMENT comment FROM information_schema.TABLES
       WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='clientes_datos'`,
    )) as unknown as Array<{ comment: string }>;
    if (rows[0]?.comment === CREATED_COMMENT)
      await queryRunner.dropTable('clientes_datos', true);
  }

  private tableDefinition(): Table {
    return new Table({
      name: 'clientes_datos',
      comment: CREATED_COMMENT,
      columns: [
        {
          name: 'id',
          type: 'int',
          isPrimary: true,
          isGenerated: true,
          generationStrategy: 'increment',
        },
        { name: 'id_usuario', type: 'int' },
        { name: 'tipo_persona', type: 'enum', enum: ['fisica', 'moral'] },
        { name: 'rfc', type: 'varchar', length: '13' },
        { name: 'razon_social', type: 'varchar', length: '254' },
        { name: 'codigo_postal', type: 'char', length: '5' },
        { name: 'regimen_fiscal', type: 'varchar', length: '3' },
        { name: 'uso_cfdi', type: 'varchar', length: '3' },
        { name: 'correo', type: 'varchar', length: '191' },
        { name: 'telefono', type: 'varchar', length: '20' },
        { name: 'es_extranjero', type: 'tinyint', unsigned: true, default: 2 },
        {
          name: 'residencia_fiscal',
          type: 'char',
          length: '3',
          isNullable: true,
        },
        {
          name: 'num_reg_id_trib',
          type: 'varchar',
          length: '40',
          isNullable: true,
        },
        {
          name: 'fecha_creacion',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP',
        },
        {
          name: 'fecha_actualizacion',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP',
          onUpdate: 'CURRENT_TIMESTAMP',
        },
      ],
      indices: [
        {
          name: 'uq_clientes_datos_usuario',
          columnNames: ['id_usuario'],
          isUnique: true,
        },
        { name: 'idx_clientes_datos_rfc', columnNames: ['rfc'] },
      ],
      foreignKeys: [
        {
          name: 'fk_clientes_datos_usuario',
          columnNames: ['id_usuario'],
          referencedTableName: 'usuarios',
          referencedColumnNames: ['id'],
          onDelete: 'NO ACTION',
          onUpdate: 'CASCADE',
        },
      ],
      checks: [
        new TableCheck({
          name: 'chk_clientes_datos_extranjero',
          expression: 'es_extranjero IN (1,2)',
        }),
      ],
    });
  }
}
