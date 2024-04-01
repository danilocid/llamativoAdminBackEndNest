import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateIssueSectionDto {
  @ApiProperty({
    description: 'El nombre de la sección de la incidencia.',
    example: 'Sección de prueba.',
  })
  @IsString()
  @IsNotEmpty({
    message: 'El nombre de la sección de la incidencia es obligatorio.',
  })
  name: string;
}

export class CreateIssueTypeDto {
  @ApiProperty({
    description: 'El nombre del tipo de la incidencia.',
    example: 'Tipo de prueba.',
  })
  @IsString()
  @IsNotEmpty({
    message: 'El nombre del tipo de la incidencia es obligatorio.',
  })
  issue_type: string;
}

export class GetIssuesDto {
  @ApiPropertyOptional({
    description:
      'Obtener todas las incidencias o solo las que no estan terminadas.',
  })
  @IsOptional()
  @ApiProperty({
    enum: ['all', 'pending'],
    default: 'all',
  })
  readonly type?: string;
}

export class CreateIssueDto {
  @ApiProperty({
    description: 'Incidencia.',
    example: 'Incidencia de prueba.',
  })
  @IsString()
  @IsNotEmpty({ message: 'La incidencia es obligatorio.' })
  issue: string;

  @ApiProperty({
    description: 'El id de la sección de la incidencia.',
    example: 1,
  })
  @IsNotEmpty({
    message: 'El id de la sección de la incidencia es obligatorio.',
  })
  section_id: number;

  @ApiProperty({
    description: 'El id del tipo de la incidencia.',
    example: 1,
  })
  @IsNotEmpty({
    message: 'El id del tipo de la incidencia es obligatorio.',
  })
  type_id: number;
}

export class UpdateIssueDto extends CreateIssueDto {
  @ApiProperty({
    description: 'El id de la incidencia.',
    example: 1,
  })
  @IsNotEmpty({ message: 'El id de la incidencia es obligatorio.' })
  id: number;

  @ApiProperty({
    description: 'El id del estado de la incidencia.',
    example: 1,
  })
  @IsNotEmpty({
    message: 'El id del estado de la incidencia es obligatorio.',
  })
  status_id: number;
}
