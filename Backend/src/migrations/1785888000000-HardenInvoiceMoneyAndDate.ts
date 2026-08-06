import { MigrationInterface, QueryRunner } from 'typeorm';

export class HardenInvoiceMoneyAndDate1785888000000 implements MigrationInterface {
  name = 'HardenInvoiceMoneyAndDate1785888000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('UPDATE `notas_de_pago` SET `fecha_emision` = CURRENT_TIMESTAMP WHERE `fecha_emision` IS NULL');
    await queryRunner.query('ALTER TABLE `notas_de_pago` MODIFY `fecha_emision` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP');
    await queryRunner.query('ALTER TABLE `notas_de_pago` MODIFY `subtotal` decimal(12,2) NULL, MODIFY `descuento` decimal(12,2) NULL, MODIFY `total` decimal(12,2) NULL');
    await queryRunner.query('ALTER TABLE `historial_compras` MODIFY `precio_unitario` decimal(12,2) NOT NULL, MODIFY `monto_sin_iva` decimal(12,2) NOT NULL, MODIFY `monto_iva` decimal(12,2) NOT NULL, MODIFY `monto_total` decimal(12,2) NOT NULL');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `historial_compras` MODIFY `precio_unitario` double NOT NULL, MODIFY `monto_sin_iva` double NOT NULL, MODIFY `monto_iva` double NOT NULL, MODIFY `monto_total` double NOT NULL');
    await queryRunner.query('ALTER TABLE `notas_de_pago` MODIFY `subtotal` double NULL, MODIFY `descuento` double NULL, MODIFY `total` double NULL');
    await queryRunner.query('ALTER TABLE `notas_de_pago` MODIFY `fecha_emision` timestamp NULL DEFAULT NULL');
  }
}
