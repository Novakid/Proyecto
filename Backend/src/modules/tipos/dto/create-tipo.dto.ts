import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsNumber } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
export class CreateTipoDto {
  @IsString()
  nombre!: string;

  @IsOptional()
  @IsString()
  descripcion!: string;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  activo!: boolean;
}
export class FilterTipoDto extends PaginationDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : Number(value))
  @IsNumber()
  tipoId?: number;
}
