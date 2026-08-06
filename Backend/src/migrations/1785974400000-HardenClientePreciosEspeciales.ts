import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class HardenClientePreciosEspeciales1785974400000 implements MigrationInterface {
  name = 'HardenClientePreciosEspeciales1785974400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('clientes_precios_especiales'))) {
      await queryRunner.createTable(
        new Table({
          name: 'clientes_precios_especiales',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'id_usuario', type: 'int' },
            { name: 'id_producto', type: 'int' },
            { name: 'precio', type: 'decimal', precision: 12, scale: 2 },
            { name: 'estatus', type: 'int', default: '1' },
            { name: 'id_empleado', type: 'int' },
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
        }),
      );
    } else {
      const duplicateRows = (await queryRunner.query(
        `SELECT COUNT(*) total FROM (
          SELECT id_usuario, id_producto FROM clientes_precios_especiales
          WHERE id_usuario IS NOT NULL AND id_producto IS NOT NULL
          GROUP BY id_usuario, id_producto HAVING COUNT(*) > 1
        ) duplicados`,
      )) as Array<{ total: string }>;
      if (Number(duplicateRows[0]?.total ?? 0) > 0) {
        throw new Error(
          'Existen precios especiales duplicados; resuelvalos antes de aplicar la migracion',
        );
      }
      await queryRunner.changeColumn(
        'clientes_precios_especiales',
        'id_usuario',
        new TableColumn({ name: 'id_usuario', type: 'int', isNullable: false }),
      );
      await queryRunner.changeColumn(
        'clientes_precios_especiales',
        'id_producto',
        new TableColumn({
          name: 'id_producto',
          type: 'int',
          isNullable: false,
        }),
      );
      await queryRunner.changeColumn(
        'clientes_precios_especiales',
        'precio',
        new TableColumn({
          name: 'precio',
          type: 'decimal',
          precision: 12,
          scale: 2,
          isNullable: false,
        }),
      );
      await queryRunner.changeColumn(
        'clientes_precios_especiales',
        'estatus',
        new TableColumn({
          name: 'estatus',
          type: 'int',
          isNullable: false,
          default: '1',
        }),
      );
      await queryRunner.changeColumn(
        'clientes_precios_especiales',
        'id_empleado',
        new TableColumn({
          name: 'id_empleado',
          type: 'int',
          isNullable: false,
        }),
      );
      await queryRunner.changeColumn(
        'clientes_precios_especiales',
        'fecha_creacion',
        new TableColumn({
          name: 'fecha_creacion',
          type: 'timestamp',
          isNullable: false,
          default: 'CURRENT_TIMESTAMP',
        }),
      );
      const table = await queryRunner.getTable('clientes_precios_especiales');
      if (!table?.findColumnByName('fecha_actualizacion')) {
        await queryRunner.addColumn(
          'clientes_precios_especiales',
          new TableColumn({
            name: 'fecha_actualizacion',
            type: 'timestamp',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          }),
        );
      }
    }

    const table = await queryRunner.getTable('clientes_precios_especiales');
    if (
      !table?.indices.some(
        (index) => index.name === 'UQ_cliente_precio_producto',
      )
    ) {
      await queryRunner.createIndex(
        'clientes_precios_especiales',
        new TableIndex({
          name: 'UQ_cliente_precio_producto',
          columnNames: ['id_usuario', 'id_producto'],
          isUnique: true,
        }),
      );
    }
    if (
      !table?.indices.some(
        (index) => index.name === 'IDX_cliente_precio_cliente',
      )
    ) {
      await queryRunner.createIndex(
        'clientes_precios_especiales',
        new TableIndex({
          name: 'IDX_cliente_precio_cliente',
          columnNames: ['id_usuario'],
        }),
      );
    }
    if (
      !table?.indices.some(
        (index) => index.name === 'IDX_cliente_precio_producto',
      )
    ) {
      await queryRunner.createIndex(
        'clientes_precios_especiales',
        new TableIndex({
          name: 'IDX_cliente_precio_producto',
          columnNames: ['id_producto'],
        }),
      );
    }

    const updated = await queryRunner.getTable('clientes_precios_especiales');
    const foreignKeys = [
      {
        name: 'FK_cliente_precio_cliente',
        column: 'id_usuario',
        table: 'usuarios',
      },
      {
        name: 'FK_cliente_precio_producto',
        column: 'id_producto',
        table: 'catalogo',
      },
      {
        name: 'FK_cliente_precio_empleado',
        column: 'id_empleado',
        table: 'usuarios',
      },
    ];
    for (const foreignKey of foreignKeys) {
      if (!updated?.foreignKeys.some((item) => item.name === foreignKey.name)) {
        await queryRunner.createForeignKey(
          'clientes_precios_especiales',
          new TableForeignKey({
            name: foreignKey.name,
            columnNames: [foreignKey.column],
            referencedTableName: foreignKey.table,
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          }),
        );
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('clientes_precios_especiales'))) return;
    const table = await queryRunner.getTable('clientes_precios_especiales');
    for (const name of [
      'FK_cliente_precio_cliente',
      'FK_cliente_precio_producto',
      'FK_cliente_precio_empleado',
    ]) {
      const foreignKey = table?.foreignKeys.find((item) => item.name === name);
      if (foreignKey)
        await queryRunner.dropForeignKey(
          'clientes_precios_especiales',
          foreignKey,
        );
    }
    for (const name of [
      'UQ_cliente_precio_producto',
      'IDX_cliente_precio_cliente',
      'IDX_cliente_precio_producto',
    ]) {
      const current = await queryRunner.getTable('clientes_precios_especiales');
      const index = current?.indices.find((item) => item.name === name);
      if (index)
        await queryRunner.dropIndex('clientes_precios_especiales', index);
    }
    const current = await queryRunner.getTable('clientes_precios_especiales');
    if (current?.findColumnByName('fecha_actualizacion'))
      await queryRunner.dropColumn(
        'clientes_precios_especiales',
        'fecha_actualizacion',
      );
    await queryRunner.changeColumn(
      'clientes_precios_especiales',
      'fecha_creacion',
      new TableColumn({
        name: 'fecha_creacion',
        type: 'date',
        isNullable: true,
      }),
    );
    await queryRunner.changeColumn(
      'clientes_precios_especiales',
      'precio',
      new TableColumn({
        name: 'precio',
        type: 'double',
        precision: 12,
        scale: 2,
        isNullable: true,
      }),
    );
    for (const column of [
      'id_usuario',
      'id_producto',
      'estatus',
      'id_empleado',
    ]) {
      await queryRunner.changeColumn(
        'clientes_precios_especiales',
        column,
        new TableColumn({ name: column, type: 'int', isNullable: true }),
      );
    }
  }
}
