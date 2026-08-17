import 'dotenv/config';
import { hash } from 'bcrypt';
import dataSource from '../config/typeorm.datasource';
import { Usuario } from '../modules/usuarios/entities/usuario.entity';
import { UserRole } from '../modules/auth/auth.types';

const USERS = [
  {
    name: 'Prueba Dev Dos',
    email: 'prueba.dev2@ejemplo.com',
    identity: 'Empleado',
    roles: ['dev'],
    status: 1,
  },
  {
    name: 'Prueba Facturista Dos',
    email: 'prueba.facturista2@ejemplo.com',
    identity: 'Empleado',
    roles: ['facturista'],
    status: 1,
  },
  {
    name: 'Prueba Vendedor Dos',
    email: 'prueba.vendedor2@ejemplo.com',
    identity: 'Empleado',
    roles: ['vendedor'],
    status: 1,
  },
  {
    name: 'Prueba Almacen Dos',
    email: 'prueba.almacen2@ejemplo.com',
    identity: 'Empleado',
    roles: ['almacen'],
    status: 1,
  },
  {
    name: 'Prueba Cliente Dos',
    email: 'prueba.cliente2@ejemplo.com',
    identity: 'Cliente',
    roles: ['cliente'],
    status: 1,
  },
  {
    name: 'Prueba Multirrol',
    email: 'prueba.multirrol@ejemplo.com',
    identity: 'Empleado',
    roles: ['vendedor', 'almacen'],
    status: 1,
  },
  {
    name: 'Prueba Inactivo',
    email: 'prueba.inactivo@ejemplo.com',
    identity: 'Empleado',
    roles: ['facturista'],
    status: 2,
  },
] as const;

async function seed(): Promise<void> {
  const password = process.env.RBAC_TEST_PASSWORD;
  if (!password || password.length < 8)
    throw new Error('RBAC_TEST_PASSWORD debe tener al menos 8 caracteres');
  if (process.env.DB_HOST !== 'localhost' || process.env.DB_NAME !== 'test') {
    throw new Error(
      'Este seed solo puede ejecutarse contra MySQL local localhost/test',
    );
  }

  await dataSource.initialize();
  try {
    await dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Usuario);
      for (const definition of USERS) {
        let user = await repository.findOne({
          where: { email: definition.email },
        });
        if (!user) {
          user = await repository.save(
            repository.create({
              Nombre: definition.name,
              identidad: definition.identity,
              email: definition.email,
              passwordHash: await hash(password, 12),
              role: UserRole.EMPLOYEE,
              estatus: definition.status,
            }),
          );
        }

        const rawRoleRows: unknown = await manager.query(
          'SELECT id,clave FROM roles WHERE clave IN (?) AND activo=1 AND asignable=1',
          [definition.roles],
        );
        const roleRows = rawRoleRows as Array<{ id: number; clave: string }>;
        if (roleRows.length !== definition.roles.length)
          throw new Error(`Roles incompletos para ${definition.email}`);

        const rawExisting: unknown = await manager.query(
          'SELECT r.clave FROM usuario_roles ur JOIN roles r ON r.id=ur.rol_id WHERE ur.usuario_id=?',
          [user.id],
        );
        const existing = rawExisting as Array<{ clave: string }>;
        if (
          existing.some(
            (entry) => !definition.roles.includes(entry.clave as never),
          )
        ) {
          throw new Error(
            `Asignacion incompatible existente para ${definition.email}`,
          );
        }
        for (const role of roleRows) {
          await manager.query(
            'INSERT IGNORE INTO usuario_roles (usuario_id,rol_id) VALUES (?,?)',
            [user.id, role.id],
          );
        }
        console.log(
          `${definition.email}: ${definition.roles.join('+')} (${definition.status === 1 ? 'activo' : 'inactivo'})`,
        );
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
      : 'No fue posible crear los datos extendidos de prueba',
  );
  process.exitCode = 1;
});
