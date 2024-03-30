import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

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
