import { Type, Transform } from 'class-transformer';
import { IsBoolean, IsNumber, IsString, IsDate, IsArray } from 'class-validator';

export class CreateProductoDto {
  @IsString()
  codigo!: string;

  @IsString()
  descripcion!: string;

  @Type(() => Number)
  @IsNumber()
  stock!: number;  

  @Type(() => Number)
  @IsNumber()
  existencia!: number;

  @Type(() => Number)
  @IsNumber()
  precio!: number;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  nuevo!: boolean;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  activo!: boolean;

  @Type(() => Number)
  @IsNumber()
  almacen!: number;

  @Type(() => Number)
  @IsNumber()
  piso!: number;

  @Type(() => Date)
  @IsDate()
  fecha_ingreso!: Date;

  @Type(() => Number)
  @IsArray()
  tipos!: number[];
}