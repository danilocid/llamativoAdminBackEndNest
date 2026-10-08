import { IsNumber, IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class AsociarVentaMlDto {
  @IsNumber()
  @IsNotEmpty()
  venta_ml_id: number;

  @IsNumber()
  @IsNotEmpty()
  tipo_documento: number;

  @IsNumber()
  @IsNotEmpty()
  documento: number;

  @IsString()
  @IsNotEmpty()
  cliente: string;

  @IsNumber()
  @IsNotEmpty()
  medio_pago: number;

  @IsObject()
  @IsOptional()
  producto_mapping?: { [titulo: string]: number };
}
