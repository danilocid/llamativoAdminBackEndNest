import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    description: 'Codigo interno',
    example: '123456',
  })
  @IsString()
  readonly cod_interno: string;

  @ApiProperty({
    description: 'Codigo de barras',
    example: '123456',
  })
  @IsOptional()
  readonly cod_barras: string;

  @ApiProperty({
    description: 'Descripcion',
    example: 'Producto de prueba',
  })
  @IsString()
  readonly descripcion: string;

  @ApiProperty({
    description: 'Costo neto',
    example: 1000,
  })
  @IsNumber()
  readonly costo_neto: number;

  @ApiProperty({
    description: 'Costo imp',
    example: 190,
  })
  @IsNumber()
  readonly costo_imp: number;

  @ApiProperty({
    description: 'Venta neto',
    example: 1000,
  })
  @IsNumber()
  readonly venta_neto: number;

  @ApiProperty({
    description: 'Venta imp',
    example: 190,
  })
  @IsNumber()
  readonly venta_imp: number;

  @ApiProperty({
    description: 'Stock critico',
    example: 10,
  })
  @IsNumber()
  readonly stock_critico: number;

  @ApiProperty({
    description: 'Publicado',
    example: false,
  })
  @IsBoolean()
  readonly publicado: boolean;

  @ApiProperty({
    description: 'Enlace de Mercado Libre',
    example: 'https://www.mercadolibre.com',
  })
  @IsOptional()
  enlace_ml: string;

  @ApiProperty({
    description: 'Id de Mercado Libre',
    example: '123456',
  })
  @IsOptional()
  id_ml: string;

  @ApiProperty({
    description: 'Id de variante de Mercado Libre',
    example: '123456',
  })
  @IsOptional()
  id_variante_ml: string;

  @ApiProperty({
    description: 'Publicado en PrestaShop',
    example: false,
  })
  @IsBoolean()
  publicado_ps: boolean;

  @ApiProperty({
    description: 'Id de PrestaShop',
    example: '123456',
  })
  @IsOptional()
  id_ps: string;

  @ApiProperty({
    description: 'Enlace de PrestaShop',
    example: 'https://www.prestashop.com',
  })
  @IsOptional()
  enlace_ps: string;
}
