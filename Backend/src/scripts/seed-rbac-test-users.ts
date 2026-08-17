import 'dotenv/config';
import { hash } from 'bcrypt';
import dataSource from '../config/typeorm.datasource';
import { Usuario } from '../modules/usuarios/entities/usuario.entity';
import { UserRole } from '../modules/auth/auth.types';

const TEST_USERS = [
  {
    role: 'dev',
    name: 'Prueba Desarrollador',
    email: 'prueba.dev@ejemplo.com',
    identity: 'Empleado',
  },
  {
    role: 'facturista',
    name: 'Prueba Facturista',
    email: 'prueba.facturista@ejemplo.com',
    identity: 'Empleado',
  },
  {
    role: 'vendedor',
    name: 'Prueba Vendedor',
    email: 'prueba.vendedor@ejemplo.com',
    identity: 'Empleado',
  },
  {
    role: 'almacen',
    name: 'Prueba Almacen',
    email: 'prueba.almacen@ejemplo.com',
    identity: 'Empleado',
  },
  {
    role: 'cliente',
    name: 'Prueba Cliente',
    email: 'prueba.cliente@ejemplo.com',
    identity: 'Cliente',
  },
] as const;

async function seed(): Promise<void> {
  const password = process.env.RBAC_TEST_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error('RBAC_TEST_PASSWORD debe tener al menos 8 caracteres');
  }

  await dataSource.initialize();
  try {
    await dataSource.transaction(async (manager) => {
      const users = manager.getRepository(Usuario);
      for (const definition of TEST_USERS) {
        const roleRows: Array<{ id: number }> = await manager.query(
          'SELECT id FROM roles WHERE clave=? AND activo=1 AND asignable=1 LIMIT 1',
          [definition.role],
        );
        if (roleRows.length !== 1)
          throw new Error(`Rol no disponible: ${definition.role}`);

        let user = await users.findOne({ where: { email: definition.email } });
        if (!user) {
          user = await users.save(
            users.create({
              Nombre: definition.name,
              identidad: definition.identity,
              email: definition.email,
              passwordHash: await hash(password, 12),
              role: UserRole.EMPLOYEE,
              estatus: 1,
            }),
          );
        }

        const current: Array<{ clave: string }> = await manager.query(
          'SELECT r.clave FROM usuario_roles ur JOIN roles r ON r.id=ur.rol_id WHERE ur.usuario_id=?',
          [user.id],
        );
        if (current.some((entry) => entry.clave !== definition.role)) {
          throw new Error(
            `El usuario ${definition.email} ya tiene una asignacion incompatible`,
          );
        }
        await manager.query(
          'INSERT IGNORE INTO usuario_roles (usuario_id,rol_id) VALUES (?,?)',
          [user.id, roleRows[0].id],
        );
        console.log(`${definition.email}: ${definition.role}`);
      }
    });
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? error.message
      : 'No fue posible crear los usuarios de prueba',
  );
  process.exitCode = 1;
});
