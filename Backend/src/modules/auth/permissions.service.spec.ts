import { ForbiddenException } from '@nestjs/common';
import { UserRole } from './auth.types';
import { PermissionsService } from './permissions.service';

describe('PermissionsService', () => {
  const user = {
    id: 10,
    Nombre: 'Prueba',
    identidad: 'Empleado',
    estatus: 1,
    role: UserRole.EMPLOYEE,
  };
  const users = { findOne: jest.fn() };
  const dataSource = { query: jest.fn() };
  let service: PermissionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PermissionsService(users as never, dataSource as never);
    users.findOne.mockResolvedValue(user);
  });

  it('combina permisos de varios roles sin duplicados', async () => {
    dataSource.query.mockResolvedValue([
      { role: 'facturista', permission: 'catalogo.ver' },
      { role: 'facturista', permission: 'catalogo.ver' },
      { role: 'vendedor', permission: 'catalogo.detalles' },
    ]);
    const result = await service.resolve(10);
    expect(result.roles).toEqual(['facturista', 'vendedor']);
    expect(result.permissions).toEqual(['catalogo.ver', 'catalogo.detalles']);
    expect(result.canAccessElectron).toBe(true);
  });

  it('rechaza la combinacion cliente con un rol interno', async () => {
    dataSource.query.mockResolvedValue([
      { role: 'cliente', permission: null },
      { role: 'vendedor', permission: 'catalogo.ver' },
    ]);
    await expect(service.resolve(10)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('conserva un fallback legado limitado para empleados pendientes', async () => {
    dataSource.query.mockResolvedValue([]);
    const result = await service.resolve(10);
    expect(result.roles).toEqual(['employee_legacy']);
    expect(result.legacyFallback).toBe(true);
    expect(result.permissions).not.toContain('catalogo.eliminar');
    expect(result.permissions).not.toContain('usuarios.desactivar');
  });

  it('bloquea inmediatamente a un usuario inactivo', async () => {
    users.findOne.mockResolvedValue({ ...user, estatus: 2 });
    await expect(service.resolve(10)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
