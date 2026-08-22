import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

const permissionKeys = [
  'ver',
  'crear',
  'editar',
  'cancelar',
  'reactivar',
  'generar_factura',
  'imprimir',
];

export class CompleteCotizacionesModule1787270400000 implements MigrationInterface {
  name = 'CompleteCotizacionesModule1787270400000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE IF NOT EXISTS cotizaciones (
      id int NOT NULL AUTO_INCREMENT, folio_cotizacion varchar(100) NOT NULL,
      folio_especial varchar(100) NULL, id_cliente int NULL, id_vendedor int NULL,
      creado_por_usuario_id int NULL, metodo_pago varchar(100) NULL, credito tinyint NOT NULL DEFAULT 0,
      almacen varchar(100) NULL, subtotal decimal(12,2) NOT NULL DEFAULT 0,
      descuento decimal(12,2) NOT NULL DEFAULT 0, iva decimal(12,2) NOT NULL DEFAULT 0,
      total decimal(12,2) NOT NULL DEFAULT 0, datos_fiscales_snapshot longtext NULL,
      observaciones text NULL, solicitada int NOT NULL DEFAULT 0,
      fecha_cotizacion timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, fecha_vigencia date NULL,
      fecha_entrega date NULL, fecha_solicitada timestamp NULL, fecha_cancelada timestamp NULL,
      fecha_reactivada timestamp NULL, PRIMARY KEY(id), UNIQUE KEY uq_cotizaciones_folio(folio_cotizacion),
      CONSTRAINT chk_cotizaciones_solicitada CHECK (solicitada IN (0,1,2))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await q.query(`CREATE TABLE IF NOT EXISTS cotizacion_detalles (
      id int NOT NULL AUTO_INCREMENT, id_cotizacion int NOT NULL, id_catalogo int NULL,
      codigo_producto varchar(100) NULL, nombre_producto varchar(255) NOT NULL, cantidad int NOT NULL,
      precio_unitario decimal(12,2) NOT NULL, precio_original decimal(12,2) NULL,
      descuento decimal(5,2) NOT NULL DEFAULT 0, monto_descuento decimal(12,2) NOT NULL DEFAULT 0,
      monto_sin_iva decimal(12,2) NOT NULL, monto_iva decimal(12,2) NOT NULL,
      monto_total decimal(12,2) NOT NULL, redem int NOT NULL DEFAULT 0, PRIMARY KEY(id),
      CONSTRAINT fk_cotizacion_detalles_cotizacion FOREIGN KEY(id_cotizacion) REFERENCES cotizaciones(id) ON DELETE CASCADE,
      CONSTRAINT chk_cotizacion_detalles_redem CHECK (redem IN (0,1,2))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    const columns: Array<[string, TableColumn]> = [
      [
        'credito',
        new TableColumn({
          name: 'credito',
          type: 'tinyint',
          isNullable: false,
          default: 0,
        }),
      ],
      [
        'fecha_entrega',
        new TableColumn({
          name: 'fecha_entrega',
          type: 'date',
          isNullable: true,
        }),
      ],
      [
        'fecha_reactivada',
        new TableColumn({
          name: 'fecha_reactivada',
          type: 'timestamp',
          isNullable: true,
        }),
      ],
    ];
    for (const [name, column] of columns)
      if (!(await q.hasColumn('cotizaciones', name)))
        await q.addColumn('cotizaciones', column);
    if (!(await q.hasColumn('cotizacion_detalles', 'descuento')))
      await q.addColumn(
        'cotizacion_detalles',
        new TableColumn({
          name: 'descuento',
          type: 'decimal',
          precision: 5,
          scale: 2,
          isNullable: false,
          default: 0,
        }),
      );
    await q.query(
      'ALTER TABLE cotizaciones MODIFY metodo_pago varchar(100) NULL, MODIFY solicitada int NOT NULL DEFAULT 0',
    );
    await q.query(
      'ALTER TABLE cotizacion_detalles MODIFY redem int NOT NULL DEFAULT 0',
    );

    const indexes: Array<[string, string, string[]]> = [
      ['cotizaciones', 'idx_cotizaciones_fecha', ['fecha_cotizacion']],
      ['cotizaciones', 'idx_cotizaciones_vendedor', ['id_vendedor']],
      [
        'cotizacion_detalles',
        'idx_cotizacion_detalles_cotizacion',
        ['id_cotizacion'],
      ],
      ['cotizacion_detalles', 'idx_cotizacion_detalles_redem', ['redem']],
    ];
    for (const [tableName, name, columnNames] of indexes) {
      const table = await q.getTable(tableName);
      if (!table?.indices.some((index) => index.name === name))
        await q.createIndex(tableName, new TableIndex({ name, columnNames }));
    }

    await q.query(`CREATE TABLE IF NOT EXISTS cotizacion_folio_consecutivos (
      anio smallint unsigned NOT NULL, ultimo_consecutivo bigint unsigned NOT NULL,
      fecha_actualizacion timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY(anio)
    ) ENGINE=InnoDB`);
    for (const action of permissionKeys)
      await q.query(
        'INSERT INTO permisos (clave,modulo,accion,activo) VALUES (?,?,?,1) ON DUPLICATE KEY UPDATE modulo=VALUES(modulo),accion=VALUES(accion),activo=1',
        [`cotizaciones.${action}`, 'cotizaciones', action],
      );
    await q.query(
      "INSERT IGNORE INTO rol_permisos (rol_id,permiso_id) SELECT r.id,p.id FROM roles r JOIN permisos p ON p.clave LIKE 'cotizaciones.%' WHERE r.clave IN ('administrador','dev')",
    );
    await q.query(
      "INSERT IGNORE INTO rol_permisos (rol_id,permiso_id) SELECT r.id,p.id FROM roles r JOIN permisos p ON p.clave IN ('cotizaciones.ver','cotizaciones.crear','cotizaciones.editar','cotizaciones.cancelar','cotizaciones.reactivar','cotizaciones.generar_factura','cotizaciones.imprimir') WHERE r.clave='facturista'",
    );
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(
      "DELETE rp FROM rol_permisos rp JOIN permisos p ON p.id=rp.permiso_id WHERE p.clave LIKE 'cotizaciones.%'",
    );
    await q.query("DELETE FROM permisos WHERE clave LIKE 'cotizaciones.%'");
    if (await q.hasTable('cotizacion_folio_consecutivos'))
      await q.dropTable('cotizacion_folio_consecutivos');
    for (const [table, column] of [
      ['cotizacion_detalles', 'descuento'],
      ['cotizaciones', 'fecha_reactivada'],
      ['cotizaciones', 'fecha_entrega'],
      ['cotizaciones', 'credito'],
    ] as const)
      if (await q.hasColumn(table, column)) await q.dropColumn(table, column);
  }
}
