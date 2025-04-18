import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class GetPurchasesDto {
  // month and year are required

  @ApiProperty({
    description: 'month',
    example: 3,
  })
  @IsNotEmpty()
  month: number;

  @ApiProperty({
    description: 'year',
    example: 2025,
  })
  @IsNotEmpty()
  year: number;
}
