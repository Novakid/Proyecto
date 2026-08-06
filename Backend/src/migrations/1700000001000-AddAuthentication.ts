import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthentication1700000001000 implements MigrationInterface {
  name = 'AddAuthentication1700000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `usuarios` ADD COLUMN `email` varchar(191) NULL, ADD COLUMN `password_hash` varchar(255) NULL, ADD COLUMN `role` enum('admin','employee') NOT NULL DEFAULT 'employee'");
    await queryRunner.query('CREATE UNIQUE INDEX `IDX_usuarios_email` ON `usuarios` (`email`)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `IDX_usuarios_email` ON `usuarios`');
    await queryRunner.query('ALTER TABLE `usuarios` DROP COLUMN `role`, DROP COLUMN `password_hash`, DROP COLUMN `email`');
  }
}
