import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { hash } from 'bcrypt';
import { Usuario } from './entities/usuario.entity';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { FilterUsuarioDto } from './dto/filter-usuario.dto';
import {
  CreateUsuarioRegistrationDto,
  REGIMENES_FISCALES,
  USOS_CFDI,
} from './dto/create-usuario-registration.dto';
import {
  ClienteDatos,
  TipoPersonaFiscal,
} from './entities/cliente-datos.entity';
import { UserRole } from '../auth/auth.types';
import { UpdateUsuarioRegistrationDto } from './dto/update-usuario-registration.dto';

@Injectable()
export class UsuarioService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly dataSource: DataSource,
  ) {}

  async createRegistration(
    dto: CreateUsuarioRegistrationDto,
    canAssignRoles: boolean,
  ) {
    if (!canAssignRoles)
      throw new ForbiddenException('No tiene permiso para asignar roles');
    if (dto.credenciales.password !== dto.credenciales.passwordConfirmation) {
      throw new BadRequestException('Las contraseñas no coinciden');
    }
    const isClient = dto.tipoUsuario === 'cliente';
    if (isClient && dto.roles?.length)
      throw new BadRequestException(
        'Un cliente no puede recibir roles enviados por el cliente',
      );
    if (!isClient && dto.datosFiscales)
      throw new BadRequestException(
        'Un empleado no puede enviar datos fiscales de cliente',
      );
    if (isClient && !dto.datosFiscales)
      throw new BadRequestException(
        'Los datos fiscales son obligatorios para un cliente',
      );
    if (!isClient && !dto.roles?.length)
      throw new BadRequestException('Debe seleccionar al menos un rol');
    if (dto.datosFiscales) this.validateFiscalData(dto.datosFiscales);

    return this.dataSource.transaction(async (manager) => {
      const email = dto.credenciales.email.toLowerCase();
      if (await manager.getRepository(Usuario).existsBy({ email }))
        throw new ConflictException('El correo ya esta registrado');
      const roles = isClient ? ['cliente'] : dto.roles!;
      const validatedRoles = await this.findRegistrationRoles(
        manager,
        roles,
        isClient,
      );
      const fiscalRfc = dto.datosFiscales?.rfc.toUpperCase();
      const profile = dto.datosUsuario;
      const usuario = manager.getRepository(Usuario).create({
        Nombre: profile.Nombre.trim(),
        Apellido_p: this.optional(profile.Apellido_p),
        Apellido_m: this.optional(profile.Apellido_m),
        Calle: this.optional(profile.Calle),
        num_interior: this.optional(profile.num_interior),
        num_exterior: this.optional(profile.num_exterior),
        poblacion: this.optional(profile.poblacion),
        cp: this.optional(profile.cp),
        colonia: this.optional(profile.colonia),
        descuento: Number(profile.descuento ?? 0),
        rfc: isClient ? fiscalRfc! : this.optional(profile.rfc)?.toUpperCase(),
        estatus: profile.estatus,
        identidad: isClient ? 'Cliente' : 'Empleado',
        tipoUsuario: dto.tipoUsuario,
        canalAcceso: isClient ? 'web' : 'ambos',
        estatusAcceso: profile.estatus,
        authzVersion: '1',
        email,
        passwordHash: await hash(dto.credenciales.password, 12),
        role: UserRole.EMPLOYEE,
      });
      const saved = await manager.getRepository(Usuario).save(usuario);
      if (isClient) {
        const fiscal = dto.datosFiscales!;
        await manager.getRepository(ClienteDatos).save(
          manager.getRepository(ClienteDatos).create({
            idUsuario: saved.id,
            tipoPersona: fiscal.tipoPersona as TipoPersonaFiscal,
            rfc: fiscal.rfc.toUpperCase(),
            razonSocial: fiscal.razonSocial.trim(),
            codigoPostal: fiscal.codigoPostal,
            regimenFiscal: fiscal.regimenFiscal.toUpperCase(),
            usoCfdi: fiscal.usoCfdi.toUpperCase(),
            correo: fiscal.correo.toLowerCase(),
            telefono: fiscal.telefono.trim(),
            esExtranjero: fiscal.esExtranjero,
            residenciaFiscal:
              fiscal.esExtranjero === 1
                ? fiscal.residenciaFiscal!.toUpperCase()
                : null,
            numRegIdTrib:
              fiscal.esExtranjero === 1 ? fiscal.numRegIdTrib!.trim() : null,
          }),
        );
      }
      for (const role of validatedRoles) {
        await manager.query(
          'INSERT INTO usuario_roles (usuario_id,rol_id) VALUES (?,?)',
          [saved.id, role.id],
        );
      }
      return {
        success: true,
        message: 'Usuario registrado correctamente',
        data: {
          id: saved.id,
          tipoUsuario: dto.tipoUsuario,
          roles: validatedRoles.map((role) => role.clave),
        },
      };
    });
  }

  private async findRegistrationRoles(
    manager: EntityManager,
    keys: string[],
    client: boolean,
  ) {
    const unique = [...new Set(keys)];
    if (unique.length !== keys.length)
      throw new BadRequestException('No se permiten roles duplicados');
    if (unique.includes('administrador'))
      throw new ForbiddenException('El rol administrador no es asignable');
    if (
      (client && unique.some((key) => key !== 'cliente')) ||
      (!client && unique.includes('cliente'))
    ) {
      throw new BadRequestException(
        'Los roles no son compatibles con el tipo de usuario',
      );
    }
    const raw: unknown = await manager.query(
      'SELECT id,clave FROM roles WHERE activo=1 AND asignable=1 AND clave IN (?)',
      [unique],
    );
    const roles = raw as Array<{ id: number; clave: string }>;
    if (roles.length !== unique.length)
      throw new BadRequestException(
        'Uno o más roles no existen, están inactivos o no son asignables',
      );
    return roles;
  }

  private validateFiscalData(
    fiscal: NonNullable<CreateUsuarioRegistrationDto['datosFiscales']>,
  ) {
    if (!REGIMENES_FISCALES.includes(fiscal.regimenFiscal as never))
      throw new BadRequestException('Régimen fiscal no válido');
    if (!USOS_CFDI.includes(fiscal.usoCfdi as never))
      throw new BadRequestException('Uso de CFDI no válido');
    const rfc = fiscal.rfc.toUpperCase();
    if (fiscal.esExtranjero === 1) {
      if (rfc !== 'XEXX010101000')
        throw new BadRequestException(
          'Para extranjeros el RFC debe ser XEXX010101000',
        );
      if (!fiscal.residenciaFiscal || !fiscal.numRegIdTrib)
        throw new BadRequestException(
          'Residencia fiscal y número de registro tributario son obligatorios para extranjeros',
        );
    } else {
      const expected =
        fiscal.tipoPersona === 'moral'
          ? /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/
          : /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/;
      if (!expected.test(rfc))
        throw new BadRequestException(
          'El RFC no corresponde al tipo de persona seleccionado',
        );
      if (fiscal.residenciaFiscal || fiscal.numRegIdTrib)
        throw new BadRequestException(
          'Residencia fiscal y registro tributario solo aplican a extranjeros',
        );
    }
  }

  private optional(value?: string): string | undefined {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
  }

  async findAll(params: FilterUsuarioDto) {
    const { page = 1, limit = 8, nombre, estatus } = params;
    const query = this.usuarioRepository.createQueryBuilder('usuario');
    if (nombre) {
      query.andWhere(
        `(LOWER(usuario.Nombre) LIKE LOWER(:search)
                  OR LOWER(COALESCE(usuario.email, '')) LIKE LOWER(:search)
                  OR LOWER(COALESCE(usuario.rfc, '')) LIKE LOWER(:search)
                  OR LOWER(COALESCE(usuario.identidad, '')) LIKE LOWER(:search))`,
        { search: `%${nombre.trim()}%` },
      );
    }
    if (estatus !== undefined)
      query.andWhere('usuario.estatus = :estatus', { estatus });
    const [data, total] = await query
      .orderBy('usuario.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return {
      total,
      page,
      limit,
      lastPage: Math.max(1, Math.ceil(total / limit)),
      data,
    };
  }

  async findOne(id: number) {
    const usuario = await this.usuarioRepository.findOne({
      where: { id },
      relations: { datosFiscales: true },
    });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return usuario;
  }

  async updateRegistration(
    id: number,
    dto: UpdateUsuarioRegistrationDto,
    requesterId: number,
    canAssignRoles: boolean,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Usuario);
      const usuario = await repo
        .createQueryBuilder('u')
        .addSelect('u.passwordHash')
        .leftJoinAndSelect('u.datosFiscales', 'f')
        .where('u.id=:id', { id })
        .getOne();
      if (!usuario) throw new NotFoundException('Usuario no encontrado');
      const actualType =
        String(usuario.tipoUsuario || usuario.identidad)
          .trim()
          .toLowerCase() === 'cliente'
          ? 'cliente'
          : 'empleado';
      if (dto.tipoUsuario !== actualType)
        throw new BadRequestException(
          'El tipo de usuario no puede modificarse',
        );
      if (await this.isPrimaryAdmin(manager, id))
        throw new ForbiddenException(
          'El administrador principal no puede editarse desde este flujo',
        );
      if (
        dto.cambioPassword &&
        dto.cambioPassword.nueva !== dto.cambioPassword.confirmacion
      )
        throw new BadRequestException('Las contraseñas no coinciden');
      const email = dto.email.toLowerCase();
      if (
        await repo
          .createQueryBuilder('u')
          .where('LOWER(u.email)=LOWER(:email)', { email })
          .andWhere('u.id<>:id', { id })
          .getOne()
      )
        throw new ConflictException('El correo ya esta registrado');
      if (actualType === 'cliente') {
        if (dto.roles?.length)
          throw new BadRequestException(
            'Un cliente no puede recibir roles internos',
          );
        if (!dto.datosFiscales)
          throw new BadRequestException('Los datos fiscales son obligatorios');
        this.validateFiscalData(dto.datosFiscales);
      } else {
        if (dto.datosFiscales)
          throw new BadRequestException(
            'Un empleado no puede recibir datos fiscales',
          );
        if (!dto.roles?.length)
          throw new BadRequestException('Debe seleccionar al menos un rol');
        if (!canAssignRoles)
          throw new ForbiddenException('No tiene permiso para asignar roles');
      }
      const p = dto.datosUsuario;
      Object.assign(usuario, {
        Nombre: p.Nombre.trim(),
        Apellido_p: this.optional(p.Apellido_p) ?? null,
        Apellido_m: this.optional(p.Apellido_m) ?? null,
        Calle: this.optional(p.Calle) ?? null,
        num_interior: this.optional(p.num_interior) ?? null,
        num_exterior: this.optional(p.num_exterior) ?? null,
        poblacion: this.optional(p.poblacion) ?? null,
        cp: this.optional(p.cp) ?? null,
        colonia: this.optional(p.colonia) ?? null,
        descuento: Number(p.descuento ?? 0),
        email,
        estatusAcceso: p.estatusAcceso,
      });
      let bumpVersion = false;
      if (dto.cambioPassword) {
        usuario.passwordHash = await hash(dto.cambioPassword.nueva, 12);
        bumpVersion = true;
      }
      if (actualType === 'cliente') {
        const f = dto.datosFiscales!;
        usuario.rfc = f.rfc.toUpperCase();
        usuario.canalAcceso = 'web';
        let fiscal = usuario.datosFiscales;
        if (!fiscal)
          fiscal = manager
            .getRepository(ClienteDatos)
            .create({ idUsuario: id });
        Object.assign(fiscal, {
          tipoPersona: f.tipoPersona,
          rfc: f.rfc.toUpperCase(),
          razonSocial: f.razonSocial.trim(),
          codigoPostal: f.codigoPostal,
          regimenFiscal: f.regimenFiscal,
          usoCfdi: f.usoCfdi,
          correo: f.correo.toLowerCase(),
          telefono: f.telefono.trim(),
          esExtranjero: f.esExtranjero,
          residenciaFiscal:
            f.esExtranjero === 1 ? f.residenciaFiscal!.toUpperCase() : null,
          numRegIdTrib: f.esExtranjero === 1 ? f.numRegIdTrib!.trim() : null,
        });
        await manager.getRepository(ClienteDatos).save(fiscal);
        await this.replaceRoles(manager, id, ['cliente']);
      } else {
        usuario.canalAcceso = 'ambos';
        await this.replaceRoles(manager, id, dto.roles!);
        bumpVersion = true;
      }
      if (bumpVersion)
        usuario.authzVersion = String(Number(usuario.authzVersion || 0) + 1);
      await repo.save(usuario);
      return {
        success: true,
        message: 'Usuario actualizado correctamente',
        data: { id, tipoUsuario: actualType },
      };
    });
  }

  async deactivate(id: number, requesterId: number) {
    return this.dataSource.transaction(async (manager) => {
      if (id === requesterId)
        throw new ForbiddenException('No puede desactivar su propia cuenta');
      const repo = manager.getRepository(Usuario);
      const usuario = await repo.findOneBy({ id });
      if (!usuario) throw new NotFoundException('Usuario no encontrado');
      if (usuario.estatus === 2)
        throw new BadRequestException('El usuario ya esta desactivado');
      if (await this.isPrimaryAdmin(manager, id))
        throw new ForbiddenException(
          'El administrador principal no puede desactivarse',
        );
      usuario.estatus = 2;
      usuario.estatusAcceso = 2;
      usuario.authzVersion = String(Number(usuario.authzVersion || 0) + 1);
      await repo.save(usuario);
      return { message: 'Usuario desactivado correctamente' };
    });
  }

  async reactivate(id: number) {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Usuario);
      const usuario = await repo
        .createQueryBuilder('u')
        .addSelect('u.passwordHash')
        .leftJoinAndSelect('u.datosFiscales', 'f')
        .where('u.id=:id', { id })
        .getOne();
      if (!usuario) throw new NotFoundException('Usuario no encontrado');
      if (usuario.estatus === 1 && usuario.estatusAcceso === 1)
        throw new BadRequestException('El usuario ya esta activo');
      if (!usuario.email || !usuario.passwordHash)
        throw new BadRequestException(
          'El usuario no tiene credenciales completas',
        );
      const type =
        String(usuario.tipoUsuario || usuario.identidad).toLowerCase() ===
        'cliente'
          ? 'cliente'
          : 'empleado';
      const roles: Array<{ clave: string; activo: number }> =
        await manager.query(
          'SELECT r.clave,r.activo FROM usuario_roles ur JOIN roles r ON r.id=ur.rol_id WHERE ur.usuario_id=?',
          [id],
        );
      if (
        type === 'cliente' &&
        (!usuario.datosFiscales ||
          roles.length !== 1 ||
          roles[0].clave !== 'cliente' ||
          !roles[0].activo)
      )
        throw new BadRequestException(
          'El cliente tiene datos fiscales o rol incompletos',
        );
      if (
        type === 'empleado' &&
        !roles.some(
          (r) =>
            r.activo === 1 && !['cliente', 'administrador'].includes(r.clave),
        )
      )
        throw new BadRequestException(
          'El empleado no tiene roles internos activos',
        );
      usuario.estatus = 1;
      usuario.estatusAcceso = 1;
      usuario.authzVersion = String(Number(usuario.authzVersion || 0) + 1);
      await repo.save(usuario);
      return { message: 'Usuario reactivado correctamente' };
    });
  }

  async update(id: number, updateUsuarioDto: UpdateUsuarioDto) {
    return this.dataSource.transaction(async (manager) => {
      const usuario = await manager
        .getRepository(Usuario)
        .createQueryBuilder('usuario')
        .addSelect('usuario.passwordHash')
        .where('usuario.id = :id', { id })
        .getOne();
      if (!usuario) throw new NotFoundException('Usuario no encontrado');
      const { roles, password, email, ...profile } = updateUsuarioDto;
      const primaryAdmin = await this.isPrimaryAdmin(manager, id);
      if (primaryAdmin) {
        if (profile.estatus === 2)
          throw new ForbiddenException(
            'El administrador principal no puede desactivarse',
          );
        if (roles && !roles.includes('administrador'))
          throw new ForbiddenException(
            'No puede retirarse el rol del administrador principal',
          );
      }
      const resultingEmail =
        email === undefined ? (usuario.email ?? undefined) : email;
      if (
        roles &&
        (!roles.length ||
          !resultingEmail ||
          (!usuario.passwordHash && !password))
      ) {
        throw new BadRequestException(
          'Email, password y al menos un rol son obligatorios para dar acceso',
        );
      }
      this.validateAccess(
        profile.identidad ?? usuario.identidad,
        resultingEmail,
        password,
        roles ?? [],
        false,
        primaryAdmin,
      );
      if (
        email &&
        email.toLowerCase() !== usuario.email &&
        (await manager
          .getRepository(Usuario)
          .existsBy({ email: email.toLowerCase() }))
      )
        throw new ConflictException('El correo ya esta registrado');
      Object.assign(usuario, profile);
      if (email !== undefined) usuario.email = email.toLowerCase();
      if (password) usuario.passwordHash = await hash(password, 12);
      const saved = await manager.getRepository(Usuario).save(usuario);
      if (roles) await this.replaceRoles(manager, id, roles, primaryAdmin);
      return manager.getRepository(Usuario).findOneOrFail({
        where: { id: saved.id },
      });
    });
  }

  async remove(id: number) {
    const usuario = await this.findOne(id);
    if (await this.isPrimaryAdmin(this.dataSource.manager, id))
      throw new ForbiddenException(
        'El administrador principal no puede desactivarse',
      );
    usuario.estatus = 2;
    await this.usuarioRepository.save(usuario);
    return {
      message: 'Usuario desactivado correctamente',
    };
  }

  private validateAccess(
    identity: string,
    email?: string,
    password?: string,
    roles: string[] = [],
    requireComplete = true,
    allowAdministrator = false,
  ) {
    const hasAccessData = Boolean(email || password || roles.length);
    if (
      hasAccessData &&
      requireComplete &&
      (!email || !password || !roles.length)
    )
      throw new BadRequestException(
        'Email, password y roles son obligatorios para dar acceso',
      );
    const client = String(identity).trim().toLowerCase() === 'cliente';
    if (client && roles.some((r) => r !== 'cliente'))
      throw new BadRequestException(
        'Un cliente solo puede recibir el rol cliente',
      );
    if (!client && roles.includes('cliente'))
      throw new BadRequestException(
        'Un empleado no puede recibir el rol cliente',
      );
    if (!allowAdministrator && roles.includes('administrador'))
      throw new ForbiddenException('El rol administrador no es asignable');
  }

  private async replaceRoles(
    manager: EntityManager,
    userId: number,
    roleKeys: string[],
    primaryAdmin = false,
  ) {
    const unique = [...new Set(roleKeys)];
    if (!primaryAdmin && unique.includes('administrador'))
      throw new ForbiddenException('El rol administrador no es asignable');
    const roles: Array<{ id: number; clave: string }> = await manager.query(
      'SELECT id,clave FROM roles WHERE activo=1 AND (asignable=1 OR clave=?) AND clave IN (?)',
      [primaryAdmin ? 'administrador' : '', unique],
    );
    if (roles.length !== unique.length)
      throw new BadRequestException(
        'Uno o mas roles no existen o no son asignables',
      );
    await manager.query('DELETE FROM usuario_roles WHERE usuario_id=?', [
      userId,
    ]);
    for (const role of roles)
      await manager.query(
        'INSERT INTO usuario_roles (usuario_id,rol_id) VALUES (?,?)',
        [userId, role.id],
      );
  }

  private async isPrimaryAdmin(
    manager: EntityManager,
    userId: number,
  ): Promise<boolean> {
    const raw: unknown = await manager.query(
      "SELECT 1 FROM usuario_roles ur JOIN roles r ON r.id=ur.rol_id WHERE ur.usuario_id=? AND r.clave='administrador' LIMIT 1",
      [userId],
    );
    const rows = raw as unknown[];
    return rows.length > 0;
  }
}
