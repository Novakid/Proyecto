import 'dotenv/config';
import { hash } from 'bcrypt';
import dataSource from '../config/typeorm.datasource';
import { Usuario } from '../modules/usuarios/entities/usuario.entity';
import { UserRole } from '../modules/auth/auth.types';

async function bootstrapAdmin(): Promise<void> {
  const name = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!name || !email || !password) throw new Error('ADMIN_NAME, ADMIN_EMAIL y ADMIN_PASSWORD son obligatorios');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('ADMIN_EMAIL no es valido');
  if (password.length < 8) throw new Error('ADMIN_PASSWORD debe tener al menos 8 caracteres');

  await dataSource.initialize();
  try {
    const users = dataSource.getRepository(Usuario);
    const existingAdmin = await users.findOne({ where: { role: UserRole.ADMIN } });
    if (existingAdmin) {
      console.log(`Administrador ya existente: ${existingAdmin.email ?? `usuario ${existingAdmin.id}`}`);
      return;
    }
    if (await users.existsBy({ email })) throw new Error('ADMIN_EMAIL ya pertenece a un usuario que no es administrador');
    await users.save(users.create({
      Nombre: name,
      email,
      passwordHash: await hash(password, 12),
      role: UserRole.ADMIN,
      identidad: 'Empleado',
      estatus: 1,
    }));
    console.log(`Administrador creado correctamente: ${email}`);
  } finally {
    await dataSource.destroy();
  }
}

bootstrapAdmin().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'No fue posible crear el administrador');
  process.exitCode = 1;
});
