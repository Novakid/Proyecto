import { Type, Transform } from 'class-transformer';
import { ArrayUnique, IsBoolean, IsNumber, IsString, IsDate, IsArray, IsOptional, IsInt, Min, MaxLength, ArrayNotEmpty, IsDateString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateProductoDto {
  @IsString()
  @MaxLength(50)
  codigo!: string;

  @IsString()
  @MaxLength(2000)
  descripcion!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock!: number;  

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  existencia!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precio!: number;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  nuevo!: boolean;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  activo!: boolean;

  @Transform(({ value }) => value === '' ? undefined : Number(value))
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  almacen?: number;

  @Transform(({ value }) => value === '' ? undefined : Number(value))
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  piso?: number;

  @Transform(({ value }) => {
    if (
      value === '' ||
      value === undefined ||
      value === null ||
      value === 'undefined'
    ) {
      return undefined;
    }
    return value instanceof Date ? value : new Date(String(value));
  })
  @IsDate()
  @IsOptional()
  fecha_ingreso?: Date;

  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    const values = Array.isArray(value) ? value : [value];
    return values.map((item) => Number(item));
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @IsOptional()
  tipos?: number[];
}

export class FindProductosDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string;

  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsDateString()
  desde?: string;

  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsDateString()
  hasta?: string;

  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : Number(value))
  @IsInt()
  @Min(1)
  tipo?: number;
}
