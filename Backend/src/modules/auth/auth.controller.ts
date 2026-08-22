import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { BootstrapAdminDto } from './dto/bootstrap-admin.dto';
import { LoginDto } from './dto/login.dto';
import { CreateAuthUserDto } from './dto/create-auth-user.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { UserRole } from './auth.types';
import type { AuthenticatedRequest } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('bootstrap')
  bootstrap(@Body() dto: BootstrapAdminDto) {
    return this.authService.bootstrap(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('users')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('usuarios.crear')
  createUser(@Body() dto: CreateAuthUserDto) {
    return this.authService.createUser(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return this.authService.me(request.user!.sub);
  }

  @Get('roles/asignables')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('usuarios.asignar_roles')
  assignableRoles() {
    return this.authService.assignableRoles();
  }
}
