import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, IsString } from 'class-validator';
export class ProductInventoryDto {
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
  entradas: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  salidas: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  descripcion: string;
}
export class SaveInventoryDto {
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
  entradas: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  salidas: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  obs: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  tipo_movimiento: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsArray()
  articulos: ProductInventoryDto[];
}
