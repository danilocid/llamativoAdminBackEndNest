import { IsNumber, IsNotEmpty } from 'class-validator';

export class VincularVentaExistenteDto {
  @IsNumber()
  @IsNotEmpty()
  venta_ml_id: number;

  @IsNumber()
  @IsNotEmpty()
  venta_id: number;
}
