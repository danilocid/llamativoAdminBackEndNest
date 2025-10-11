import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsDateString,
  IsOptional,
} from 'class-validator';

export class CreatePurchaseDto {
  @ApiProperty({
    description: 'RUT del proveedor',
    example: '12345678-9',
  })
  @IsNotEmpty()
  @IsString()
  proveedor: string;

  @ApiProperty({
    description: 'ID del tipo de documento',
    example: 33,
  })
  @IsNotEmpty()
  @IsNumber()
  tipo_documento: number;

  @ApiProperty({
    description: 'Número del documento',
    example: 12345,
  })
  @IsNotEmpty()
  @IsNumber()
  documento: number;

  @ApiProperty({
    description: 'Fecha del documento',
    example: '2025-09-30',
  })
  @IsNotEmpty()
  @IsDateString()
  fecha_documento: string;

  @ApiProperty({
    description: 'Monto neto del documento',
    example: 100000,
  })
  @IsNotEmpty()
  @IsNumber()
  monto_neto_documento: number;

  @ApiProperty({
    description: 'Monto de impuestos del documento',
    example: 19000,
  })
  @IsNotEmpty()
  @IsNumber()
  monto_imp_documento: number;

  @ApiProperty({
    description: 'Costo neto del documento',
    example: 100000,
  })
  @IsNotEmpty()
  @IsNumber()
  costo_neto_documento: number;

  @ApiProperty({
    description: 'Costo de impuestos del documento',
    example: 19000,
  })
  @IsNotEmpty()
  @IsNumber()
  costo_imp_documento: number;

  @ApiProperty({
    description: 'ID del tipo de compra',
    example: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  tipo_compra: number;

  @ApiProperty({
    description: 'Observaciones de la compra',
    example: 'Compra de materiales',
    required: false,
  })
  @IsOptional()
  @IsString()
  observaciones?: string;
}
