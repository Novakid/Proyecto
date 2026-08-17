import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { Repository } from 'typeorm';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BootstrapAdminDto } from './dto/bootstrap-admin.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole } from './auth.types';
import { CreateAuthUserDto } from './dto/create-auth-user.dto';
import { PermissionsService } from './permissions.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario) private readonly users: Repository<Usuario>,
    private readonly jwtService: JwtService,
    private readonly permissions: PermissionsService,
  ) {}

  async bootstrap(dto: BootstrapAdminDto) {
    if (await this.users.countBy({ role: UserRole.ADMIN })) {
      throw new ConflictException('El administrador inicial ya fue creado');
    }
    const user = this.users.create({
      Nombre: dto.nombre,
      email: dto.email.toLowerCase(),
      passwordHash: await hash(dto.password, 12),
      role: UserRole.ADMIN,
      identidad: 'Empleado',
      estatus: 1,
    });
    const saved = await this.users.save(user);
    return this.issueToken(saved);
  }

  async login(dto: LoginDto) {
    const user = await this.users
      .createQueryBuilder('usuario')
      .addSelect('usuario.passwordHash')
      .where('LOWER(usuario.email) = LOWER(:email)', { email: dto.email })
      .getOne();
    if (
      !user?.passwordHash ||
      user.estatus !== 1 ||
      !(await compare(dto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Credenciales invalidas');
    }
    const authorization = await this.permissions.resolve(user.id);
    if (dto.channel === 'electron' && !authorization.canAccessElectron)
      throw new ForbiddenException('Esta cuenta no puede ingresar a Electron');
    return this.issueToken(user);
  }

  async createUser(dto: CreateAuthUserDto) {
    if (dto.role === UserRole.ADMIN)
      throw new ConflictException('No puede crearse un segundo administrador');
    const email = dto.email.toLowerCase();
    if (await this.users.existsBy({ email })) {
      throw new ConflictException('El correo ya esta registrado');
    }
    const user = this.users.create({
      Nombre: dto.nombre,
      email,
      passwordHash: await hash(dto.password, 12),
      role: dto.role,
      identidad: 'Empleado',
      estatus: 1,
    });
    const saved = await this.users.save(user);
    return {
      id: saved.id,
      nombre: saved.Nombre,
      email: saved.email,
      role: saved.role,
    };
  }

  private async issueToken(user: Usuario) {
    return {
      accessToken: await this.jwtService.signAsync({
        sub: user.id,
        email: user.email,
        role: user.role,
        authzVersion: user.authzVersion,
      }),
      user: {
        id: user.id,
        nombre: user.Nombre,
        email: user.email,
        role: user.role,
      },
    };
  }

  me(userId: number) {
    return this.permissions.resolve(userId);
  }

  assignableRoles() {
    return this.permissions.assignableRoles();
  }
}
