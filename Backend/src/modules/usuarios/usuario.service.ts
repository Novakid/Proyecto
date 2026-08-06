import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { FilterUsuarioDto } from './dto/filter-usuario.dto';

@Injectable()
export class UsuarioService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  async create(createUsuarioDto: CreateUsuarioDto) {
    const usuario = this.usuarioRepository.create(createUsuarioDto);
    return await this.usuarioRepository.save(usuario);
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
    });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return usuario;
  }

  async update(id: number, updateUsuarioDto: UpdateUsuarioDto) {
    const usuario = await this.findOne(id);
    Object.assign(usuario, updateUsuarioDto);
    return await this.usuarioRepository.save(usuario);
  }

  async remove(id: number) {
    const usuario = await this.findOne(id);
    await this.usuarioRepository.remove(usuario);
    return {
      message: 'Usuario eliminado correctamente',
    };
  }
}
