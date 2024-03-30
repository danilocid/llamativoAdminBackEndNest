import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginAuthDto {
  @ApiProperty({
    description: 'El usuario.',
    example: 'danilo',
  })
  @IsNotEmpty({ message: 'El usuario es obligatorio.' })
  user: string;

  @ApiProperty({ description: 'La contraseña del usuario.', example: '123456' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  @IsString({ message: 'La contraseña debe ser una cadena de texto.' })
  password: string;
}
