import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCatalogoAgregarStockPermission1786838400000 implements MigrationInterface {
  name = 'AddCatalogoAgregarStockPermission1786838400000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(
      "INSERT INTO permisos (clave,modulo,accion,activo) VALUES ('catalogo.agregar_stock','catalogo','agregar_stock',1) ON DUPLICATE KEY UPDATE modulo='catalogo',accion='agregar_stock',activo=1",
    );
    await q.query(
      "INSERT IGNORE INTO rol_permisos (rol_id,permiso_id) SELECT r.id,p.id FROM roles r JOIN permisos p ON p.clave='catalogo.agregar_stock' WHERE r.clave IN ('administrador','dev')",
    );
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(
      "DELETE rp FROM rol_permisos rp JOIN permisos p ON p.id=rp.permiso_id WHERE p.clave='catalogo.agregar_stock'",
    );
    await q.query("DELETE FROM permisos WHERE clave='catalogo.agregar_stock'");
  }
}
