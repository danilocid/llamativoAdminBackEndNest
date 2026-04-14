import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class SubmitCountDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  product_id: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  stock_counted: number;
}
