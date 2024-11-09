import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class PageDto {
  @ApiProperty({
    description: 'page',
    example: 1,
    required: false,
  })
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    description: 'parametro de busqueda',
    required: false,
  })
  @IsOptional()
  param?: string;

  @ApiProperty({
    description: 'ordenar por',
    required: false,
  })
  @IsOptional()
  order?: string;

  @ApiProperty({
    description: 'ordenar de manera ascendente o descendente',
    default: 'DESC',
    required: false,
  })
  @IsOptional()
  sort?: 'ASC' | 'DESC';
}
