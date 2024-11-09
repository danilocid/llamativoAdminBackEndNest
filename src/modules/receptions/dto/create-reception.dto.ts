import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class ProductReceptionDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  id: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  costo_neto: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  costo_imp: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  unidades: number;
}

export class CreateReceptionDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  rut: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  totalUnidades: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  totalCostoNeto: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  totalCostoImp: number;

  @ApiProperty()
  @IsArray()
  @IsNotEmpty()
  products: ProductReceptionDto[];

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  documento: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  tipoDocumento: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  medioDePagoId: number;
}
