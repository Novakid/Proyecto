import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtPayload } from './auth.types';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '../usuarios/entities/usuario.entity';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(Usuario) private readonly users: Repository<Usuario>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) throw new UnauthorizedException('Token requerido');

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      const user = await this.users.findOne({ where: { id: payload.sub } });
      if (!user || user.estatus !== 1 || !user.email) throw new UnauthorizedException('Usuario no permitido');
      request.user = { sub: user.id, email: user.email, role: user.role };
      return true;
    } catch {
      throw new UnauthorizedException('Token invalido o vencido');
    }
  }
}
