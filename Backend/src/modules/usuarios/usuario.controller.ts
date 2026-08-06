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
} from '@nestjs/common';

import { UsuarioService } from './usuario.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/auth.types';
import { FilterUsuarioDto } from './dto/filter-usuario.dto';

@Controller('usuarios')
export class UsuarioController {
    constructor(
        private readonly usuarioService: UsuarioService,
    ) {}

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
    create(
        @Body() body: CreateUsuarioDto) {
        return this.usuarioService.create(body);
    }

    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
    findAll(@Query() query: FilterUsuarioDto) {
        return this.usuarioService.findAll(query);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
    findOne(
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.usuarioService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateUsuarioDto: UpdateUsuarioDto,
    ) {
        return this.usuarioService.update(id, updateUsuarioDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    remove(
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.usuarioService.remove(id);
    }
}
