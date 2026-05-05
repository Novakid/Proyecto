import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsNumber } from 'class-validator';
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
export class FilterTipoDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  tipoId?: number;
}