import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddInvoiceFiscalSnapshotAndStampState1787184000000 implements MigrationInterface {
  name = 'AddInvoiceFiscalSnapshotAndStampState1787184000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('notas_de_pago');
    if (!table) throw new Error('No existe la tabla notas_de_pago');

    if (!table.findColumnByName('datos_fiscales_snapshot')) {
      await queryRunner.addColumn(
        'notas_de_pago',
        new TableColumn({
          name: 'datos_fiscales_snapshot',
          type: 'longtext',
          isNullable: true,
        }),
      );
    }

    await queryRunner.query(
      'UPDATE notas_de_pago SET timbrado = 0 WHERE timbrado IS NULL',
    );
    await queryRunner.query(
      'ALTER TABLE notas_de_pago MODIFY timbrado tinyint NOT NULL DEFAULT 0, MODIFY fecha_timbrado timestamp NULL DEFAULT NULL',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('notas_de_pago'))) return;
    const table = await queryRunner.getTable('notas_de_pago');
    if (table?.findColumnByName('datos_fiscales_snapshot')) {
      await queryRunner.dropColumn('notas_de_pago', 'datos_fiscales_snapshot');
    }
    await queryRunner.query(
      'ALTER TABLE notas_de_pago MODIFY timbrado int NULL DEFAULT NULL, MODIFY fecha_timbrado timestamp NULL DEFAULT NULL',
    );
  }
}
