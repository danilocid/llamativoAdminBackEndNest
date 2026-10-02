import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsObject,
  Max,
  Min,
} from 'class-validator';
import { PurchaseApiData } from './purchases-api.interface';

export class ImportRcvDto {
  @ApiProperty({
    description: 'Mes del período importado (1-12)',
    example: 9,
  })
  @Type(() => Number)
  @IsInt({ message: 'mes debe ser un número entero' })
  @Min(1, { message: 'mes debe estar entre 1 y 12' })
  @Max(12, { message: 'mes debe estar entre 1 y 12' })
  mes: number;

  @ApiProperty({ description: 'Año del período importado', example: 2026 })
  @Type(() => Number)
  @IsInt({ message: 'anio debe ser un número entero' })
  @Min(2000, { message: 'anio debe ser válido' })
  @Max(2100, { message: 'anio debe ser válido' })
  anio: number;

  @ApiProperty({
    description: 'Registros crudos extraídos del RCV por el servicio de scraping',
    type: [Object],
  })
  @IsArray({ message: 'registros debe ser un arreglo' })
  @IsObject({ each: true, message: 'Cada registro debe ser un objeto' })
  registros: PurchaseApiData[];
}
