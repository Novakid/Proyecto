import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Patch,
  Delete,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';

import { UsuarioService } from './usuario.service';
import { CreateUsuarioRegistrationDto } from './dto/create-usuario-registration.dto';
import { UpdateUsuarioRegistrationDto } from './dto/update-usuario-registration.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FilterUsuarioDto } from './dto/filter-usuario.dto';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsService } from '../auth/permissions.service';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';

@Controller('usuarios')
export class UsuarioController {
  constructor(
    private readonly usuarioService: UsuarioService,
    private readonly permissionsService: PermissionsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('usuarios.crear', 'usuarios.asignar_roles')
  create(
    @Body() body: CreateUsuarioRegistrationDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.usuarioService.createRegistration(
      body,
      request.user!.permissions?.includes('usuarios.asignar_roles') ?? false,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('usuarios.ver')
  findAll(@Query() query: FilterUsuarioDto) {
    return this.usuarioService.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('usuarios.detalles')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return Promise.all([
      this.usuarioService.findOne(id),
      this.permissionsService.resolve(id, { allowInactive: true }),
    ]).then(([usuario, acceso]) => ({ ...usuario, acceso }));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('usuarios.editar')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUsuarioDto: UpdateUsuarioRegistrationDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.usuarioService.updateRegistration(
      id,
      updateUsuarioDto,
      request.user!.sub,
      request.user!.permissions?.includes('usuarios.asignar_roles') ?? false,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('usuarios.desactivar')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.usuarioService.deactivate(id, request.user!.sub);
  }

  @Post(':id/reactivar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('usuarios.desactivar')
  reactivate(@Param('id', ParseIntPipe) id: number) {
    return this.usuarioService.reactivate(id);
  }
}
