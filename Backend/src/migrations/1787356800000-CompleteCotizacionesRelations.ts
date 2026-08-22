import {
  MigrationInterface,
  QueryRunner,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CompleteCotizacionesRelations1787356800000 implements MigrationInterface {
  name = 'CompleteCotizacionesRelations1787356800000';

  async up(q: QueryRunner): Promise<void> {
    const indexes: Array<[string, string, string[]]> = [
      ['cotizaciones', 'idx_cotizaciones_cliente', ['id_cliente']],
      [
        'cotizaciones',
        'idx_cotizaciones_creado_por',
        ['creado_por_usuario_id'],
      ],
      ['cotizaciones', 'idx_cotizaciones_solicitada', ['solicitada']],
      [
        'cotizacion_detalles',
        'idx_cotizacion_detalles_producto',
        ['id_catalogo'],
      ],
    ];
    for (const [tableName, name, columnNames] of indexes) {
      const table = await q.getTable(tableName);
      if (
        !table?.indices.some(
          (index) =>
            index.name === name ||
            index.columnNames.join() === columnNames.join(),
        )
      ) {
        await q.createIndex(tableName, new TableIndex({ name, columnNames }));
      }
    }

    const foreignKeys: Array<[string, string, string, string, string]> = [
      [
        'cotizaciones',
        'fk_cotizaciones_cliente',
        'id_cliente',
        'usuarios',
        'RESTRICT',
      ],
      [
        'cotizaciones',
        'fk_cotizaciones_vendedor',
        'id_vendedor',
        'usuarios',
        'RESTRICT',
      ],
      [
        'cotizaciones',
        'fk_cotizaciones_creado_por',
        'creado_por_usuario_id',
        'usuarios',
        'RESTRICT',
      ],
      [
        'cotizacion_detalles',
        'fk_cotizacion_detalles_producto',
        'id_catalogo',
        'catalogo',
        'RESTRICT',
      ],
    ];
    for (const [
      tableName,
      name,
      column,
      referencedTableName,
      onDelete,
    ] of foreignKeys) {
      const table = await q.getTable(tableName);
      if (table?.foreignKeys.some((key) => key.columnNames.includes(column)))
        continue;
      const invalid = (await q.query(
        `SELECT COUNT(*) total FROM ${tableName} source LEFT JOIN ${referencedTableName} target ON target.id=source.${column} WHERE source.${column} IS NOT NULL AND target.id IS NULL`,
      )) as unknown as Array<{ total: string | number }>;
      if (Number(invalid[0]?.total) > 0)
        throw new Error(
          `No se puede crear ${name}: existen referencias inválidas en ${tableName}.${column}`,
        );
      await q.createForeignKey(
        tableName,
        new TableForeignKey({
          name,
          columnNames: [column],
          referencedTableName,
          referencedColumnNames: ['id'],
          onDelete,
        }),
      );
    }
  }

  async down(q: QueryRunner): Promise<void> {
    for (const [tableName, name] of [
      ['cotizacion_detalles', 'fk_cotizacion_detalles_producto'],
      ['cotizaciones', 'fk_cotizaciones_creado_por'],
      ['cotizaciones', 'fk_cotizaciones_vendedor'],
      ['cotizaciones', 'fk_cotizaciones_cliente'],
    ] as const) {
      const table = await q.getTable(tableName);
      const key = table?.foreignKeys.find((item) => item.name === name);
      if (key) await q.dropForeignKey(tableName, key);
    }
  }
}
