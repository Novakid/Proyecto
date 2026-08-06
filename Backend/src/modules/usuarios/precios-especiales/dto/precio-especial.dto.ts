import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationDto } from '../../../../common/dto/pagination.dto';

const decimalTransform = ({ value }: { value: unknown }) => {
  if (value === '' || value === null || value === undefined) return value;
  return Number(value);
};

export class CreatePrecioEspecialDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productoId!: number;

  @Transform(decimalTransform)
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(9_999_999_999.99)
  precioEspecial!: number;
}

export class UpdatePrecioEspecialDto {
  @IsOptional()
  @Transform(decimalTransform)
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(9_999_999_999.99)
  precioEspecial?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([1, 2], { message: 'estatus debe ser 1 (activo) o 2 (inactivo)' })
  estatus?: number;
}

export class FilterPreciosEspecialesDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([1, 2])
  estatus?: number;
}

export class ProductosDisponiblesDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
