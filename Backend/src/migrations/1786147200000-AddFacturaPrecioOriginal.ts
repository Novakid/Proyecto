import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddFacturaPrecioOriginal1786147200000 implements MigrationInterface {
  name = 'AddFacturaPrecioOriginal1786147200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('historial_compras', 'precio_original'))) {
      await queryRunner.addColumn('historial_compras', new TableColumn({
        name: 'precio_original', type: 'decimal', precision: 12, scale: 2, isNullable: true,
      }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('historial_compras', 'precio_original'))
      await queryRunner.dropColumn('historial_compras', 'precio_original');
  }
}
