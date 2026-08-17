import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class AddAutomaticInvoiceFolios1787097600000 implements MigrationInterface {
  name = 'AddAutomaticInvoiceFolios1787097600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('notas_de_pago');
    if (!table) throw new Error('No existe la tabla notas_de_pago');

    if (!table.findColumnByName('folio_especial')) {
      await queryRunner.addColumn(
        'notas_de_pago',
        new TableColumn({
          name: 'folio_especial',
          type: 'varchar',
          length: '100',
          isNullable: true,
        }),
      );
    }

    const duplicates = (await queryRunner.query(
      `SELECT TRIM(folio_cliente) folio, COUNT(*) cantidad
       FROM notas_de_pago
       WHERE folio_cliente IS NOT NULL AND TRIM(folio_cliente) <> ''
       GROUP BY TRIM(folio_cliente)
       HAVING COUNT(*) > 1
       LIMIT 10`,
    )) as Array<{ folio: string; cantidad: string | number }>;
    if (duplicates.length) {
      throw new Error(
        `No se puede crear la restricción única: existen folios duplicados (${duplicates
          .map((row) => `${row.folio}: ${row.cantidad}`)
          .join(', ')})`,
      );
    }

    // Los registros históricos sin folio reciben un identificador estable y único.
    await queryRunner.query(
      `UPDATE notas_de_pago
       SET folio_cliente = CONCAT('HIST-', LPAD(id, 12, '0'))
       WHERE folio_cliente IS NULL OR TRIM(folio_cliente) = ''`,
    );
    await queryRunner.query(
      `ALTER TABLE notas_de_pago
       MODIFY folio_cliente varchar(100) NOT NULL,
       MODIFY folio_especial varchar(100) NULL`,
    );

    const refreshed = await queryRunner.getTable('notas_de_pago');
    const hasUniqueFolio = refreshed?.indices.some(
      (index) =>
        index.isUnique &&
        index.columnNames.length === 1 &&
        index.columnNames[0] === 'folio_cliente',
    );
    if (!hasUniqueFolio) {
      await queryRunner.createIndex(
        'notas_de_pago',
        new TableIndex({
          name: 'uq_notas_de_pago_folio_cliente',
          columnNames: ['folio_cliente'],
          isUnique: true,
        }),
      );
    }

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS factura_folio_consecutivos (
         anio smallint unsigned NOT NULL,
         ultimo_consecutivo bigint unsigned NOT NULL,
         fecha_actualizacion timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
         PRIMARY KEY (anio)
       ) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `INSERT INTO factura_folio_consecutivos (anio, ultimo_consecutivo)
       SELECT
         CAST(SUBSTRING(folio_cliente, 5, 4) AS UNSIGNED),
         MAX(CAST(SUBSTRING(folio_cliente, 10) AS UNSIGNED))
       FROM notas_de_pago
       WHERE folio_cliente REGEXP '^FAC-[0-9]{4}-[0-9]{6,}$'
       GROUP BY CAST(SUBSTRING(folio_cliente, 5, 4) AS UNSIGNED)
       ON DUPLICATE KEY UPDATE
         ultimo_consecutivo = GREATEST(ultimo_consecutivo, VALUES(ultimo_consecutivo))`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('notas_de_pago')) {
      const table = await queryRunner.getTable('notas_de_pago');
      const unique = table?.indices.find(
        (index) =>
          index.name === 'uq_notas_de_pago_folio_cliente' ||
          (index.isUnique &&
            index.columnNames.length === 1 &&
            index.columnNames[0] === 'folio_cliente'),
      );
      if (unique) await queryRunner.dropIndex('notas_de_pago', unique);
      await queryRunner.query(
        'ALTER TABLE notas_de_pago MODIFY folio_cliente varchar(100) NULL',
      );
    }
    if (await queryRunner.hasTable('factura_folio_consecutivos')) {
      await queryRunner.dropTable('factura_folio_consecutivos');
    }
  }
}
