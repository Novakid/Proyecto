import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class AgregarStockDto {
  @Type(() => Number)
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad a agregar debe ser mayor que cero' })
  @Max(1000000, { message: 'La cantidad a agregar excede el máximo permitido' })
  cantidad!: number;
}
