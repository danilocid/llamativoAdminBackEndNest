import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** Valores posibles del color (clases Bootstrap/AdminLTE). */
export const NOTIFICATION_COLORS = [
  'success',
  'warning',
  'danger',
  'info',
] as const;

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

  @ApiProperty({
    description:
      'Color de criticidad (opcional). Si no se envía, se clasifica automáticamente.',
    example: 'success',
    enum: NOTIFICATION_COLORS,
    required: false,
  })
  @IsOptional()
  @IsIn(NOTIFICATION_COLORS, {
    message:
      'El color debe ser success, warning, danger o info (celeste).',
  })
  color?: string;
}
