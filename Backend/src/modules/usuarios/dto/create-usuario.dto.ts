import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
export class CreateUsuarioDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1, { message: 'Nombre no puede estar vacio' })
  @MaxLength(100)
  Nombre!: string;

  @IsOptional()
  @IsString()
  Apellido_p!: string;

  @IsOptional()
  @IsString()
  Apellido_m!: string;

  @IsOptional()
  @IsString()
  Calle!: string;

  @IsOptional()
  @IsString()
  num_interior!: string;

  @IsOptional()
  @IsString()
  num_exterior!: string;

  @IsOptional()
  @IsString()
  poblacion!: string;

  @IsOptional()
  @IsString()
  cp!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  descuento!: number;

  @IsOptional()
  @IsString()
  rfc!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsIn([1, 2], { message: 'estatus debe ser 1 (activo) o 2 (inactivo)' })
  estatus!: number;

  @IsOptional()
  @IsString()
  colonia!: string;

  @IsOptional()
  @IsString()
  identidad!: string;
}
