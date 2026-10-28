import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateSettingDto {
  @ApiProperty({
    description: 'Clave técnica del parámetro (minúsculas, números y guiones bajos)',
    example: 'telegram_chat_id',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9_]+$/, {
    message: 'name solo puede contener minúsculas, números y guiones bajos',
  })
  name: string;

  @ApiProperty({
    description: 'Valor del parámetro',
    example: '123456789',
  })
  @IsString()
  @IsNotEmpty()
  parameter: string;
}

export class UpdateSettingDto {
  @ApiProperty({
    description: 'Valor del parámetro',
    example: '123456789',
  })
  @IsString()
  @IsNotEmpty()
  parameter: string;
}
