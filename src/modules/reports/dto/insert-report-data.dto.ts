import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsString } from 'class-validator';

export class ReportDataDto {
  @ApiProperty({
    description: 'id del dato',
    example: 1,
  })
  @IsNumber()
  id: number;

  @ApiProperty({
    description: 'valor',
    example: '2021',
  })
  @IsString()
  valor: string;
}

export class InsertReportDataDto {
  @ApiProperty({
    description: 'mes',
    example: 1,
  })
  @IsNumber()
  mes: number;

  @ApiProperty({
    description: 'año',
    example: 2021,
  })
  @IsNumber()
  año: number;

  @ApiProperty({
    description: 'datos del reporte',
    example: [
      {
        id: 1,
        valor: '2021',
      },
      {
        id: 2,
        valor: '2022',
      },
    ],
  })
  @IsArray()
  data: ReportDataDto[];
}
