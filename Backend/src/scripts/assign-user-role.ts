import 'dotenv/config';
import dataSource from '../config/typeorm.datasource';

const INTERNAL_ROLES = new Set(['dev', 'facturista', 'vendedor', 'almacen']);

async function assign(): Promise<void> {
  const userId = Number(process.env.MIGRATE_USER_ID);
  const role = process.env.MIGRATE_ROLE?.trim().toLowerCase();
  if (!Number.isInteger(userId) || userId <= 0 || !role) {
    throw new Error('MIGRATE_USER_ID y MIGRATE_ROLE son obligatorios');
  }
  if (
    role === 'administrador' ||
    (!INTERNAL_ROLES.has(role) && role !== 'cliente')
  ) {
    throw new Error('MIGRATE_ROLE no es asignable');
  }

  await dataSource.initialize();
  try {
    await dataSource.transaction(async (manager) => {
      const users: Array<{ identidad: string }> = await manager.query(
        'SELECT identidad FROM usuarios WHERE id=? LIMIT 1',
        [userId],
      );
      if (users.length !== 1) throw new Error('Usuario no encontrado');
      const isClient = users[0].identidad?.trim().toLowerCase() === 'cliente';
      if (
        (isClient && role !== 'cliente') ||
        (!isClient && role === 'cliente')
      ) {
        throw new Error('El rol no es compatible con la identidad del usuario');
      }
      const roles: Array<{ id: number }> = await manager.query(
        'SELECT id FROM roles WHERE clave=? AND activo=1 AND asignable=1 LIMIT 1',
        [role],
      );
      if (roles.length !== 1) throw new Error('Rol no disponible');
      const incompatible: Array<{ clave: string }> = await manager.query(
        `SELECT r.clave FROM usuario_roles ur JOIN roles r ON r.id=ur.rol_id
         WHERE ur.usuario_id=? AND r.clave<>?`,
        [userId, role],
      );
      if (incompatible.length)
        throw new Error(
          'El usuario ya tiene otra asignacion; revisela manualmente',
        );
      await manager.query(
        'INSERT IGNORE INTO usuario_roles (usuario_id,rol_id) VALUES (?,?)',
        [userId, roles[0].id],
      );
      console.log(`Usuario ${userId} vinculado con ${role}`);
    });
  } finally {
    await dataSource.destroy();
  }
}

assign().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'No fue posible asignar el rol',
  );
  process.exitCode = 1;
});
