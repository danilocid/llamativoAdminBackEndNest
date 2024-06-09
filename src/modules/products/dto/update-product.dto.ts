import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber } from 'class-validator';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends CreateProductDto {
  @ApiProperty({
    description: 'Id del producto',
    example: 1,
  })
  @IsNumber()
  readonly id: number;

  @ApiProperty({
    description: 'Activo',
    example: true,
  })
  @IsBoolean()
  readonly activo: boolean;

  updatedAt: Date;
}
