import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class UpdatePurchaseDto {
  @ApiProperty({
    description: 'Tipo de compra',
    example: 1,
  })
  @IsNotEmpty()
  TipoCompra: number;

  @ApiProperty({
    description: 'Observaciones',
    example: 'Observaciones de la compra',
  })
  @IsNotEmpty()
  Observaciones: string;

  @ApiProperty({
    description: 'Costo total',
    example: 10000,
  })
  @IsNotEmpty()
  CostoTotal: number;
}
