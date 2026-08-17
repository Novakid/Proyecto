import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsDefined,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const upper = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;
const lower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export const REGIMENES_FISCALES = [
  '601',
  '603',
  '605',
  '606',
  '607',
  '608',
  '609',
  '610',
  '611',
  '612',
  '614',
  '615',
  '616',
  '620',
  '621',
  '622',
  '623',
  '624',
  '625',
  '626',
] as const;
export const USOS_CFDI = [
  'G01',
  'G02',
  'G03',
  'I01',
  'I02',
  'I03',
  'I04',
  'I05',
  'I06',
  'I07',
  'I08',
  'D01',
  'D02',
  'D03',
  'D04',
  'D05',
  'D06',
  'D07',
  'D08',
  'D09',
  'D10',
  'S01',
  'CP01',
  'CN01',
] as const;

export class DatosUsuarioRegistroDto {
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(100) Nombre!: string;
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
  @Transform(trim) @IsOptional() @Matches(/^\d{5}$/) cp?: string;
  @Transform(trim) @IsOptional() @IsString() @MaxLength(100) colonia?: string;
  @Transform(upper) @IsOptional() @IsString() @MaxLength(13) rfc?: string;
  @Type(() => Number) @IsOptional() @Min(0) @Max(100) descuento?: number;
  @Type(() => Number) @IsInt() @IsIn([1, 2]) estatus!: number;
}

export class CredencialesRegistroDto {
  @Transform(lower) @IsEmail() @MaxLength(191) email!: string;
  @IsString() @MinLength(8) @MaxLength(128) password!: string;
  @IsString() @MinLength(8) @MaxLength(128) passwordConfirmation!: string;
}

export class DatosFiscalesRegistroDto {
  @IsIn(['fisica', 'moral']) tipoPersona!: 'fisica' | 'moral';
  @Transform(upper) @IsString() @IsNotEmpty() @MaxLength(13) rfc!: string;
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  razonSocial!: string;
  @Transform(trim) @Matches(/^\d{5}$/) codigoPostal!: string;
  @Transform(upper) @IsIn(REGIMENES_FISCALES) regimenFiscal!: string;
  @Transform(upper) @IsIn(USOS_CFDI) usoCfdi!: string;
  @Transform(lower) @IsEmail() @MaxLength(191) correo!: string;
  @Transform(trim) @Matches(/^\+?[0-9\s-]{7,20}$/) telefono!: string;
  @Type(() => Number) @IsInt() @IsIn([1, 2]) esExtranjero!: number;
  @ValidateIf((value: DatosFiscalesRegistroDto) => value.esExtranjero === 1)
  @Transform(upper)
  @Matches(/^[A-Z]{3}$/)
  residenciaFiscal?: string;
  @ValidateIf((value: DatosFiscalesRegistroDto) => value.esExtranjero === 1)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  numRegIdTrib?: string;
}

export class CreateUsuarioRegistrationDto {
  @IsIn(['cliente', 'empleado']) tipoUsuario!: 'cliente' | 'empleado';

  @IsDefined()
  @ValidateNested()
  @Type(() => DatosUsuarioRegistroDto)
  datosUsuario!: DatosUsuarioRegistroDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => CredencialesRegistroDto)
  credenciales!: CredencialesRegistroDto;

  @ValidateIf(
    (dto: CreateUsuarioRegistrationDto) => dto.tipoUsuario === 'empleado',
  )
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  roles?: string[];

  @ValidateIf(
    (dto: CreateUsuarioRegistrationDto) => dto.tipoUsuario === 'cliente',
  )
  @IsDefined()
  @ValidateNested()
  @Type(() => DatosFiscalesRegistroDto)
  datosFiscales?: DatosFiscalesRegistroDto;
}
