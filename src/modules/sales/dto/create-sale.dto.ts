import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsString } from 'class-validator';

export class CreateSaleProductDto {
  @ApiProperty({
    description: 'id del producto',
    example: 1,
  })
  articulo: number;

  @ApiProperty({
    description: 'cantidad de productos',
    example: 1,
  })
  cantidad: number;

  @ApiProperty({
    description: 'precio neto del producto',
    example: 1000,
  })
  precio_neto: number;

  @ApiProperty({
    description: 'precio impuesto del producto',
    example: 190,
  })
  precio_imp: number;

  @ApiProperty({
    description: 'costo neto del producto',
    example: 500,
  })
  costo_neto: number;

  @ApiProperty({
    description: 'costo impuesto del producto',
    example: 95,
  })
  costo_imp: number;
}
export class CreateSaleDto {
  @ApiProperty({
    description: 'id del tipo de documento',
    example: 1,
  })
  @IsNumber(
    {},
    {
      message: 'El tipo de documento es obligatorio',
    },
  )
  tipo_documento: number;

  @ApiProperty({
    description: 'número de documento',
    example: 12345678,
  })
  @IsNumber(
    {},
    {
      message: 'El número de documento es obligatorio',
    },
  )
  documento: number;

  @ApiProperty({
    description: 'id del cliente',
    example: '1111111-1',
  })
  @IsString({
    message: 'El cliente es obligatorio',
  })
  cliente: string;

  @ApiProperty({
    description: 'id del medio de pago',
    example: 1,
  })
  @IsNumber(
    {},
    {
      message: 'El medio de pago es obligatorio',
    },
  )
  medio_pago: number;

  @ApiProperty({
    description: 'monto neto de la venta',
    example: 1000,
  })
  @IsNumber(
    {},
    {
      message: 'El monto neto es obligatorio',
    },
  )
  monto_neto: number;

  @ApiProperty({
    description: 'monto impuesto de la venta',
    example: 190,
  })
  @IsNumber(
    {},
    {
      message: 'El monto impuesto es obligatorio',
    },
  )
  monto_imp: number;

  @ApiProperty({
    description: 'costo neto de la venta',
    example: 500,
  })
  @IsNumber(
    {},
    {
      message: 'El costo neto es obligatorio',
    },
  )
  costo_neto: number;

  @ApiProperty({
    description: 'costo impuesto de la venta',
    example: 95,
  })
  @IsNumber(
    {},
    {
      message: 'El costo impuesto es obligatorio',
    },
  )
  costo_imp: number;

  @ApiProperty({
    description: 'productos de la venta',
    type: [CreateSaleProductDto],
  })
  @IsArray()
  productos: CreateSaleProductDto[];
}
