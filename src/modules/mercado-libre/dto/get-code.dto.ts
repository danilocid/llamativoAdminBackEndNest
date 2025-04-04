import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class GetCodeDto {
  @ApiProperty({
    description: 'code',
    example: '123456',
  })
  @IsOptional()
  code?: string;

  @ApiProperty({
    description: 'error',
    example: 'https://www.google.com',
  })
  @IsOptional()
  error?: string;

  @ApiProperty({
    description: 'error_description',
    example: 'https://www.google.com',
  })
  @IsOptional()
  error_description?: string;
}
