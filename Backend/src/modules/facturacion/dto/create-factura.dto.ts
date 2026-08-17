import {
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsOptional,
  IsInt,
  Min,
  Max,
  ArrayNotEmpty,
  MaxLength,
  IsDateString,
  IsIn,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

const trimOptionalString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() || null : value;

class ClienteDto {
  @IsString()
  @MaxLength(255)
  nombre!: string;

  @IsString()
  @MaxLength(20)
  rfc!: string;

  @IsString()
  @MaxLength(255)
  direccion!: string;

  @IsString()
  @MaxLength(255)
  colonia!: string;

  @IsString()
  @MaxLength(255)
  poblacion!: string;

  @IsDateString()
  fechaEntrega!: string;

  @IsString()
  @MaxLength(255)
  operador!: string;

  @IsBoolean()
  credito!: boolean;
}

class ConceptoDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  producto_id!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  cantidad!: number;

  @IsNumber()
  @IsOptional()
  precio_unitario?: number;

  @IsNumber()
  @IsOptional()
  subtotal?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  descuento!: number;

  @IsNumber()
  @IsOptional()
  total?: number;
}

class TotalesDto {
  @IsNumber()
  subtotal!: number;

  @IsNumber()
  descuento!: number;

  @IsNumber()
  iva!: number;

  @IsNumber()
  total!: number;
}

export class CreateFacturaDto {
  @IsOptional()
  @Transform(trimOptionalString)
  @IsString()
  @MaxLength(100)
  folioEspecial?: string | null;

  @IsDateString()
  @IsOptional()
  fecha?: string;

  @IsString()
  @MaxLength(255)
  vendedor!: string;

  @IsString()
  @MaxLength(255)
  almacen!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  clienteId!: number;

  @ValidateNested()
  @Type(() => ClienteDto)
  cliente!: ClienteDto;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ConceptoDto)
  conceptos!: ConceptoDto[];

  @ValidateNested()
  @IsOptional()
  @Type(() => TotalesDto)
  totales?: TotalesDto;
}

export class SearchFacturaCatalogDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(100)
  search = '';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  limit = 10;
}

export class FilterFacturasDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 8;
  @IsOptional() @IsString() @MaxLength(255) folio?: string;
  @IsOptional() @IsString() @MaxLength(255) cliente?: string;
  @IsOptional() @IsDateString() desde?: string;
  @IsOptional() @IsDateString() hasta?: string;
  @IsOptional() @IsIn(['activa', 'cancelada']) estatus?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) monto?: number;
}
