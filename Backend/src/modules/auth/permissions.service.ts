import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { UserRole } from './auth.types';

export interface EffectiveAuthorization {
  id: number;
  nombre: string;
  tipoUsuario: string;
  roles: string[];
  permissions: string[];
  canAccessElectron: boolean;
  canAccessWeb: boolean;
  legacyFallback: boolean;
}

const INTERNAL_ROLES = [
  'administrador',
  'dev',
  'facturista',
  'vendedor',
  'almacen',
];
const LEGACY_EMPLOYEE_PERMISSIONS = [
  'dashboard.ver',
  'catalogo.ver',
  'catalogo.detalles',
  'catalogo.crear',
  'catalogo.editar',
  'facturacion.ver',
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
];

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);
  constructor(
    @InjectRepository(Usuario) private readonly users: Repository<Usuario>,
    private readonly dataSource: DataSource,
  ) {}

  async resolve(
    userId: number,
    options: { allowInactive?: boolean } = {},
  ): Promise<EffectiveAuthorization> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (!options.allowInactive && user.estatus !== 1)
      throw new ForbiddenException('Usuario no permitido');
    const rows: Array<{ role: string; permission: string | null }> =
      await this.dataSource.query(
        `SELECT r.clave role, p.clave permission FROM usuario_roles ur
       JOIN roles r ON r.id=ur.rol_id AND r.activo=1
       LEFT JOIN rol_permisos rp ON rp.rol_id=r.id
       LEFT JOIN permisos p ON p.id=rp.permiso_id AND p.activo=1
       WHERE ur.usuario_id=? ORDER BY r.clave,p.clave`,
        [userId],
      );
    let roles = [...new Set(rows.map((x) => x.role))];
    let permissions = [
      ...new Set(
        rows.map((x) => x.permission).filter((x): x is string => Boolean(x)),
      ),
    ];
    const hasClient = roles.includes('cliente');
    if (hasClient && roles.some((r) => INTERNAL_ROLES.includes(r)))
      throw new ForbiddenException('Asignacion de roles incompatible');
    let legacyFallback = false;
    if (!roles.length) {
      legacyFallback = true;
      if (user.role === UserRole.ADMIN) {
        roles = ['administrador'];
        permissions = await this.allActivePermissions();
      } else if (String(user.identidad).trim().toLowerCase() === 'cliente')
        roles = ['cliente'];
      else {
        roles = ['employee_legacy'];
        permissions = LEGACY_EMPLOYEE_PERMISSIONS;
      }
      this.logger.warn(
        `Fallback legado de autorizacion utilizado por usuario ${user.id}`,
      );
    }
    return {
      id: user.id,
      nombre: user.Nombre,
      tipoUsuario: String(user.identidad || '').toLowerCase(),
      roles,
      permissions,
      canAccessElectron: roles.some((r) => INTERNAL_ROLES.includes(r)),
      canAccessWeb: true,
      legacyFallback,
    };
  }

  async allActivePermissions(): Promise<string[]> {
    const rows: Array<{ clave: string }> = await this.dataSource.query(
      'SELECT clave FROM permisos WHERE activo=1 ORDER BY clave',
    );
    return rows.map((x) => x.clave);
  }

  async assignableRoles(): Promise<
    Array<{
      clave: string;
      nombre: string;
      descripcion: string | null;
      permissions: string[];
    }>
  > {
    const raw: unknown = await this.dataSource.query(
      `SELECT r.clave,r.nombre,r.descripcion,p.clave permission
       FROM roles r
       LEFT JOIN rol_permisos rp ON rp.rol_id=r.id
       LEFT JOIN permisos p ON p.id=rp.permiso_id AND p.activo=1
       WHERE r.activo=1 AND r.asignable=1 AND r.clave<>'administrador'
       ORDER BY r.nombre,p.clave`,
    );
    const rows = raw as Array<{
      clave: string;
      nombre: string;
      descripcion: string | null;
      permission: string | null;
    }>;
    const roles = new Map<
      string,
      {
        clave: string;
        nombre: string;
        descripcion: string | null;
        permissions: string[];
      }
    >();
    for (const row of rows) {
      if (!roles.has(row.clave))
        roles.set(row.clave, {
          clave: row.clave,
          nombre: row.nombre,
          descripcion: row.descripcion,
          permissions: [],
        });
      if (row.permission)
        roles.get(row.clave)!.permissions.push(row.permission);
    }
    return [...roles.values()];
  }
}
