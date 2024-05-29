import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class PageDto {
  @ApiProperty({
    description: 'page',
    example: 1,
  })
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    description: 'parametro de busqueda',
  })
  @IsOptional()
  param?: string;

  @ApiProperty({
    description: 'ordenar por',
  })
  @IsOptional()
  order?: string;

  @ApiProperty({
    description: 'ordenar de manera ascendente o descendente',
    default: 'DESC',
  })
  @IsOptional()
  sort?: 'ASC' | 'asc' | 'DESC' | 'desc';
}
