import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CotizacionConceptoDto {
  @Type(() => Number) @IsInt() @Min(1) productoId!: number;
  @Type(() => Number) @IsInt() @Min(1) cantidad!: number;
  @Type(() => Number) @IsNumber() @Min(0) @Max(100) descuento = 0;
}

export class SaveCotizacionDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  folioEspecial?: string;
  @Type(() => Number) @IsInt() @Min(1) clienteId!: number;
  @Type(() => Number) @IsInt() @Min(1) vendedorId!: number;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  metodoPago?: string;
  @IsBoolean() credito!: boolean;
  @Transform(trim) @IsString() @MaxLength(100) almacen!: string;
  @IsOptional() @IsDateString() fechaVigencia?: string;
  @IsOptional() @IsDateString() fechaEntrega?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  observaciones?: string;
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CotizacionConceptoDto)
  conceptos!: CotizacionConceptoDto[];
}

export class FilterCotizacionesDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 8;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(100) folio?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(255) cliente?: string;
  @IsOptional() @IsDateString() desde?: string;
  @IsOptional() @IsDateString() hasta?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) monto?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([0, 1, 2])
  solicitada?: number;
}

export class SearchCotizacionDto {
  @Transform(trim) @IsString() @MaxLength(100) search = '';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10) limit = 10;
}
