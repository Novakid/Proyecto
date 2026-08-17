import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { DatosFiscalesRegistroDto } from './create-usuario-registration.dto';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const lower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class DatosUsuarioActualizacionDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(100) Nombre!: string;
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  Apellido_p?: string;
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  Apellido_m?: string;
  @Transform(trim) @IsOptional() @IsString() @MaxLength(100) Calle?: string;
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  num_interior?: string;
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  num_exterior?: string;
  @Transform(trim) @IsOptional() @IsString() @MaxLength(100) poblacion?: string;
  @Transform(trim) @IsOptional() @IsString() @MaxLength(10) cp?: string;
  @Transform(trim) @IsOptional() @IsString() @MaxLength(100) colonia?: string;
  @Type(() => Number) @IsOptional() @Min(0) @Max(100) descuento?: number;
  @Type(() => Number) @IsInt() @IsIn([1, 2]) estatusAcceso!: number;
}

export class CambioPasswordDto {
  @IsString() @MinLength(8) @MaxLength(128) nueva!: string;
  @IsString() @MinLength(8) @MaxLength(128) confirmacion!: string;
}

export class UpdateUsuarioRegistrationDto {
  @IsIn(['cliente', 'empleado']) tipoUsuario!: 'cliente' | 'empleado';
  @ValidateNested()
  @Type(() => DatosUsuarioActualizacionDto)
  datosUsuario!: DatosUsuarioActualizacionDto;
  @Transform(lower) @IsEmail() @MaxLength(191) email!: string;
  @ValidateIf(
    (dto: UpdateUsuarioRegistrationDto) => dto.tipoUsuario === 'empleado',
  )
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  roles?: string[];
  @ValidateIf(
    (dto: UpdateUsuarioRegistrationDto) => dto.tipoUsuario === 'cliente',
  )
  @ValidateNested()
  @Type(() => DatosFiscalesRegistroDto)
  datosFiscales?: DatosFiscalesRegistroDto;
  @IsOptional()
  @ValidateNested()
  @Type(() => CambioPasswordDto)
  cambioPassword?: CambioPasswordDto;
}
