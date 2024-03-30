import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty({
    description: 'El título de la notificación.',
    example: 'Notificación de prueba.',
  })
  @IsString()
  @IsNotEmpty({ message: 'El título de la notificación es obligatorio.' })
  title: string;

  @ApiProperty({
    description: 'La descripción de la notificación.',
    example: 'Esta es una notificación de prueba.',
  })
  @IsString()
  @IsNotEmpty({
    message: 'La descripción de la notificación es obligatoria.',
  })
  description: string;
}
