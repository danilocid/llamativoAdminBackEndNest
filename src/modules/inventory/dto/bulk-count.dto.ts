import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BulkCountItemDto {
  @ApiProperty({ description: 'ID del producto' })
  @IsNotEmpty()
  @IsNumber()
  product_id: number;

  @ApiProperty({ description: 'Stock contado físicamente' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  stock_counted: number;
}

export class BulkCountDto {
  @ApiProperty({
    type: [BulkCountItemDto],
    description: 'Lista de productos contados (máx. 10)',
  })
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => BulkCountItemDto)
  items: BulkCountItemDto[];
}
