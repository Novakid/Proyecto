import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`usuarios\` (\`id\` int NOT NULL AUTO_INCREMENT, \`Nombre\` varchar(100) NOT NULL, \`Apellido_p\` varchar(100) NULL, \`Apellido_m\` varchar(100) NULL, \`Calle\` varchar(150) NULL, \`num_interior\` varchar(20) NULL, \`num_exterior\` varchar(20) NULL, \`poblacion\` varchar(100) NULL, \`cp\` varchar(10) NULL, \`descuento\` decimal(10,2) NOT NULL DEFAULT 0, \`rfc\` varchar(20) NULL, \`estatus\` int NOT NULL DEFAULT 1, \`colonia\` varchar(100) NULL, \`identidad\` varchar(50) NULL, \`fecha_creacion\` timestamp NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`tipos\` (\`id\` int NOT NULL AUTO_INCREMENT, \`nombre\` varchar(255) NOT NULL, \`descripcion\` varchar(255) NULL, \`activo\` tinyint NOT NULL DEFAULT 1, \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`catalogo\` (\`id\` int NOT NULL AUTO_INCREMENT, \`codigo\` varchar(50) NOT NULL, \`descripcion\` text NOT NULL, \`stock\` int NOT NULL, \`existencia\` int NOT NULL, \`precio\` decimal(10,2) NOT NULL, \`nuevo\` tinyint NOT NULL, \`activo\` tinyint NOT NULL, \`almacen\` int NOT NULL, \`piso\` int NOT NULL, \`fecha_ingreso\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`tipo_imagenes\` (\`id\` int NOT NULL AUTO_INCREMENT, \`url\` varchar(255) NOT NULL, \`tipo_id\` int NULL, PRIMARY KEY (\`id\`), CONSTRAINT \`FK_tipo_imagen_tipo\` FOREIGN KEY (\`tipo_id\`) REFERENCES \`tipos\`(\`id\`) ON DELETE CASCADE) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`producto_imagenes\` (\`id\` int NOT NULL AUTO_INCREMENT, \`url\` varchar(255) NOT NULL, \`producto_id\` int NULL, PRIMARY KEY (\`id\`), CONSTRAINT \`FK_producto_imagen_producto\` FOREIGN KEY (\`producto_id\`) REFERENCES \`catalogo\`(\`id\`) ON DELETE CASCADE) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`producto_tipos\` (\`producto_id\` int NOT NULL, \`tipo_id\` int NOT NULL, PRIMARY KEY (\`producto_id\`, \`tipo_id\`), CONSTRAINT \`FK_producto_tipos_producto\` FOREIGN KEY (\`producto_id\`) REFERENCES \`catalogo\`(\`id\`) ON DELETE CASCADE, CONSTRAINT \`FK_producto_tipos_tipo\` FOREIGN KEY (\`tipo_id\`) REFERENCES \`tipos\`(\`id\`) ON DELETE CASCADE) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`notas_de_pago\` (\`id\` int NOT NULL AUTO_INCREMENT, \`cfdi\` varchar(255) NULL, \`uuid\` varchar(255) NULL, \`tfd\` varchar(255) NULL, \`xml\` varchar(255) NULL, \`metodo_pago\` varchar(255) NULL, \`fecha_emision\` timestamp NULL, \`fecha_timbrado\` timestamp NULL, \`fecha_cancelado\` timestamp NULL, \`folio_cliente\` varchar(255) NULL, \`id_cliente\` int NULL, \`vendedor\` varchar(255) NULL, \`almacen\` varchar(255) NULL, \`subtotal\` double NULL, \`descuento\` double NULL, \`total\` double NULL, \`razon_social\` varchar(255) NULL, \`rfc\` varchar(255) NULL, \`direccion\` varchar(255) NULL, \`poblacion\` varchar(255) NULL, \`colonia\` varchar(255) NULL, \`fecha_entrega\` date NULL, \`operador\` varchar(255) NULL, \`credito\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`historial_compras\` (\`id\` int NOT NULL AUTO_INCREMENT, \`id_catalogo\` int NULL, \`cantidad\` int NOT NULL, \`precio_unitario\` double NOT NULL, \`monto_sin_iva\` double NOT NULL, \`monto_iva\` double NOT NULL, \`monto_total\` double NOT NULL, \`id_folio\` int NULL, PRIMARY KEY (\`id\`), CONSTRAINT \`FK_historial_factura\` FOREIGN KEY (\`id_folio\`) REFERENCES \`notas_de_pago\`(\`id\`), CONSTRAINT \`FK_historial_producto\` FOREIGN KEY (\`id_catalogo\`) REFERENCES \`catalogo\`(\`id\`)) ENGINE=InnoDB`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `historial_compras`');
    await queryRunner.query('DROP TABLE IF EXISTS `notas_de_pago`');
    await queryRunner.query('DROP TABLE IF EXISTS `producto_tipos`');
    await queryRunner.query('DROP TABLE IF EXISTS `producto_imagenes`');
    await queryRunner.query('DROP TABLE IF EXISTS `tipo_imagenes`');
    await queryRunner.query('DROP TABLE IF EXISTS `catalogo`');
    await queryRunner.query('DROP TABLE IF EXISTS `tipos`');
    await queryRunner.query('DROP TABLE IF EXISTS `usuarios`');
  }
}
