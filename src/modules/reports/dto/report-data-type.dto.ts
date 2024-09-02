import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class ReportDataTypeDto {
  @ApiProperty({
    description: 'nombre del tipo de dato',
    example: 'Ventas',
  })
  @IsString()
  dato: string;

  @ApiProperty({
    description: 'activo',
    example: 1,
  })
  @IsNumber()
  activo: number;

  @ApiProperty({
    description: 'orden',
    example: 1,
  })
  @IsNumber()
  orden: number;

  @ApiProperty({
    description: 'es número',
    example: 1,
  })
  @IsNumber()
  isNumber: number;

  @ApiProperty({
    description: 'es dinero',
    example: 1,
  })
  @IsNumber()
  isMoney: number;
}
