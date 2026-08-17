import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

const roles = [
  [
    'administrador',
    'Administrador',
    'Administrador principal del sistema',
    1,
    1,
    2,
  ],
  ['dev', 'Desarrollador', 'Administracion tecnica autorizada', 1, 1, 1],
  ['facturista', 'Facturista', 'Gestion de facturas propias', 1, 1, 1],
  ['vendedor', 'Vendedor', 'Consulta del catalogo', 1, 1, 1],
  ['almacen', 'Almacén', 'Consulta del catalogo', 1, 1, 1],
  ['cliente', 'Cliente', 'Acceso web sin ventanas administrativas', 1, 1, 1],
] as const;

const permissions = [
  'dashboard.ver',
  'catalogo.ver',
  'catalogo.detalles',
  'catalogo.crear',
  'catalogo.editar',
  'catalogo.eliminar',
  'facturacion.ver',
  'facturacion.ver_propias',
  'facturacion.ver_todas',
  'facturacion.crear',
  'facturacion.editar',
  'facturacion.detalles',
  'facturacion.imprimir',
  'facturacion.timbrar',
  'facturacion.cancelar',
  'usuarios.ver',
  'usuarios.detalles',
  'usuarios.crear',
  'usuarios.editar',
  'usuarios.desactivar',
  'usuarios.asignar_roles',
] as const;

const facturista = [
  'catalogo.ver',
  'catalogo.detalles',
  'facturacion.ver',
  'facturacion.ver_propias',
  'facturacion.crear',
  'facturacion.editar',
  'facturacion.detalles',
  'facturacion.imprimir',
  'facturacion.timbrar',
  'facturacion.cancelar',
  'usuarios.ver',
  'usuarios.detalles',
];
const catalogOnly = ['catalogo.ver', 'catalogo.detalles'];

export class AddRoleBasedPermissions1786233600000 implements MigrationInterface {
  name = 'AddRoleBasedPermissions1786233600000';

  async up(q: QueryRunner): Promise<void> {
    await this.ensureTables(q);
    await this.ensureColumnsAndIndexes(q);
    await this.ensureForeignKeys(q);
    await this.seed(q);
    if (!(await q.hasColumn('notas_de_pago', 'creado_por_usuario_id'))) {
      await q.addColumn(
        'notas_de_pago',
        new TableColumn({
          name: 'creado_por_usuario_id',
          type: 'int',
          isNullable: true,
        }),
      );
      await q.createIndex(
        'notas_de_pago',
        new TableIndex({
          name: 'IDX_notas_creado_por',
          columnNames: ['creado_por_usuario_id'],
        }),
      );
      await q.createForeignKey(
        'notas_de_pago',
        new TableForeignKey({
          name: 'FK_notas_creado_por',
          columnNames: ['creado_por_usuario_id'],
          referencedTableName: 'usuarios',
          referencedColumnNames: ['id'],
          onDelete: 'RESTRICT',
        }),
      );
    }
  }

  private async ensureTables(q: QueryRunner) {
    if (!(await q.hasTable('roles')))
      await q.createTable(
        new Table({
          name: 'roles',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'clave', type: 'varchar', length: '100' },
            { name: 'nombre', type: 'varchar', length: '100' },
            {
              name: 'descripcion',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            { name: 'activo', type: 'tinyint', unsigned: true, default: 1 },
            { name: 'es_sistema', type: 'tinyint', unsigned: true, default: 1 },
            { name: 'asignable', type: 'tinyint', unsigned: true, default: 1 },
          ],
        }),
      );
    if (!(await q.hasTable('permisos')))
      await q.createTable(
        new Table({
          name: 'permisos',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'clave', type: 'varchar', length: '100' },
            { name: 'modulo', type: 'varchar', length: '100' },
            { name: 'accion', type: 'varchar', length: '100' },
            { name: 'activo', type: 'tinyint', unsigned: true, default: 1 },
          ],
        }),
      );
    if (!(await q.hasTable('rol_permisos')))
      await q.createTable(
        new Table({
          name: 'rol_permisos',
          columns: [
            { name: 'rol_id', type: 'int', isPrimary: true },
            { name: 'permiso_id', type: 'int', isPrimary: true },
          ],
        }),
      );
    if (!(await q.hasTable('usuario_roles')))
      await q.createTable(
        new Table({
          name: 'usuario_roles',
          columns: [
            { name: 'usuario_id', type: 'int', isPrimary: true },
            { name: 'rol_id', type: 'int', isPrimary: true },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
      );
  }

  private async ensureColumnsAndIndexes(q: QueryRunner) {
    await q.query(
      'ALTER TABLE roles MODIFY clave varchar(100) NOT NULL, MODIFY nombre varchar(100) NOT NULL, MODIFY activo tinyint unsigned NOT NULL DEFAULT 1, MODIFY es_sistema tinyint unsigned NOT NULL DEFAULT 1, MODIFY asignable tinyint unsigned NOT NULL DEFAULT 1',
    );
    await q.query(
      'ALTER TABLE permisos MODIFY clave varchar(100) NOT NULL, MODIFY modulo varchar(100) NOT NULL, MODIFY accion varchar(100) NOT NULL, MODIFY activo tinyint unsigned NOT NULL DEFAULT 1',
    );
    const roleTable = await q.getTable('roles');
    if (
      !roleTable!.indices.some(
        (i) => i.isUnique && i.columnNames.join() === 'clave',
      )
    )
      await q.createIndex(
        'roles',
        new TableIndex({
          name: 'UQ_roles_clave',
          columnNames: ['clave'],
          isUnique: true,
        }),
      );
    if (
      !roleTable!.indices.some(
        (i) => i.isUnique && i.columnNames.join() === 'nombre',
      )
    )
      await q.createIndex(
        'roles',
        new TableIndex({
          name: 'UQ_roles_nombre',
          columnNames: ['nombre'],
          isUnique: true,
        }),
      );
    const permissionTable = await q.getTable('permisos');
    if (
      !permissionTable!.indices.some(
        (i) => i.isUnique && i.columnNames.join() === 'clave',
      )
    )
      await q.createIndex(
        'permisos',
        new TableIndex({
          name: 'UQ_permisos_clave',
          columnNames: ['clave'],
          isUnique: true,
        }),
      );
    if (
      !permissionTable!.indices.some((i) => i.columnNames.join() === 'modulo')
    )
      await q.createIndex(
        'permisos',
        new TableIndex({
          name: 'IDX_permisos_modulo',
          columnNames: ['modulo'],
        }),
      );
    await this.ensureCheck(q, 'roles', 'CHK_roles_activo', 'activo IN (1,2)');
    await this.ensureCheck(
      q,
      'roles',
      'CHK_roles_es_sistema',
      'es_sistema IN (1,2)',
    );
    await this.ensureCheck(
      q,
      'roles',
      'CHK_roles_asignable',
      'asignable IN (1,2)',
    );
    await this.ensureCheck(
      q,
      'permisos',
      'CHK_permisos_activo',
      'activo IN (1,2)',
    );
  }

  private async ensureCheck(
    q: QueryRunner,
    table: string,
    name: string,
    expression: string,
  ) {
    const rows = (await q.query(
      `SELECT COUNT(*) amount FROM information_schema.TABLE_CONSTRAINTS
       WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME=? AND CONSTRAINT_NAME=? AND CONSTRAINT_TYPE='CHECK'`,
      [table, name],
    )) as unknown as Array<{ amount: string | number }>;
    if (Number(rows[0]?.amount ?? 0) === 0)
      await q.query(
        `ALTER TABLE \`${table}\` ADD CONSTRAINT \`${name}\` CHECK (${expression})`,
      );
  }

  private async ensureForeignKeys(q: QueryRunner) {
    const definitions = [
      ['rol_permisos', 'FK_rol_permisos_rol', 'rol_id', 'roles'],
      ['rol_permisos', 'FK_rol_permisos_permiso', 'permiso_id', 'permisos'],
      ['usuario_roles', 'FK_usuario_roles_usuario', 'usuario_id', 'usuarios'],
      ['usuario_roles', 'FK_usuario_roles_rol', 'rol_id', 'roles'],
    ];
    for (const [table, name, column, referenced] of definitions) {
      const current = await q.getTable(table);
      if (!current!.foreignKeys.some((fk) => fk.columnNames.includes(column)))
        await q.createForeignKey(
          table,
          new TableForeignKey({
            name,
            columnNames: [column],
            referencedTableName: referenced,
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          }),
        );
    }
  }

  private async seed(q: QueryRunner) {
    for (const role of roles)
      await q.query(
        'INSERT INTO roles (clave,nombre,descripcion,activo,es_sistema,asignable) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE nombre=VALUES(nombre),descripcion=VALUES(descripcion),activo=VALUES(activo),es_sistema=VALUES(es_sistema),asignable=VALUES(asignable)',
        [...role],
      );
    for (const key of permissions) {
      const [module, action] = key.split('.');
      await q.query(
        'INSERT INTO permisos (clave,modulo,accion,activo) VALUES (?,?,?,1) ON DUPLICATE KEY UPDATE modulo=VALUES(modulo),accion=VALUES(accion),activo=1',
        [key, module, action],
      );
    }
    const assign = async (
      role: string,
      keys: readonly string[],
    ): Promise<void> => {
      await q.query(
        'INSERT IGNORE INTO rol_permisos (rol_id,permiso_id) SELECT r.id,p.id FROM roles r JOIN permisos p ON p.clave IN (?) WHERE r.clave=?',
        [keys, role],
      );
    };
    await assign('administrador', permissions);
    await assign('dev', permissions);
    await assign('facturista', facturista);
    await assign('vendedor', catalogOnly);
    await assign('almacen', catalogOnly);
    const admins = (await q.query(
      "SELECT id FROM usuarios WHERE role='admin' AND estatus=1",
    )) as unknown as Array<{ id: number }>;
    if (admins.length !== 1)
      throw new Error(
        `Se requiere exactamente un administrador activo para migrar; encontrados: ${admins.length}`,
      );
    await q.query(
      "INSERT IGNORE INTO usuario_roles (usuario_id,rol_id) SELECT ?,id FROM roles WHERE clave='administrador'",
      [admins[0].id],
    );
    await q.query(
      "INSERT IGNORE INTO usuario_roles (usuario_id,rol_id) SELECT u.id,r.id FROM usuarios u JOIN roles r ON r.clave='cliente' WHERE LOWER(TRIM(u.identidad))='cliente'",
    );
  }

  async down(q: QueryRunner): Promise<void> {
    if (await q.hasColumn('notas_de_pago', 'creado_por_usuario_id')) {
      const table = await q.getTable('notas_de_pago');
      const fk = table!.foreignKeys.find((x) =>
        x.columnNames.includes('creado_por_usuario_id'),
      );
      if (fk) await q.dropForeignKey('notas_de_pago', fk);
      const idx = table!.indices.find((x) =>
        x.columnNames.includes('creado_por_usuario_id'),
      );
      if (idx) await q.dropIndex('notas_de_pago', idx);
      await q.dropColumn('notas_de_pago', 'creado_por_usuario_id');
    }
    await q.query(
      "DELETE ur FROM usuario_roles ur JOIN roles r ON r.id=ur.rol_id WHERE r.clave IN ('administrador','dev','facturista','vendedor','almacen','cliente')",
    );
    await q.query(
      'DELETE rp FROM rol_permisos rp JOIN permisos p ON p.id=rp.permiso_id WHERE p.clave IN (?)',
      [permissions],
    );
    await q.query('DELETE FROM permisos WHERE clave IN (?)', [permissions]);
    await q.query(
      "DELETE FROM roles WHERE clave IN ('administrador','dev','facturista','vendedor','almacen','cliente')",
    );
  }
}
