import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  Min,
} from 'class-validator';
enum Tipo {
  'B' = 'B',
  'C' = 'C',
  'P' = 'P',
}

export class CreateEntityDto {
  //rut de la entidad
  @ApiProperty({
    description: 'Rut de la entidad.',
    example: '11111111-1.',
  })
  @IsString()
  @IsNotEmpty({
    message: 'El rut de la entidad es obligatorio.',
  })
  rut: string;
  //nombre de la entidad
  @ApiProperty({
    description: 'Nombre de la entidad.',
    example: 'Entidad de prueba.',
  })
  @IsString()
  @IsNotEmpty({
    message: 'El nombre de la entidad es obligatorio.',
  })
  nombre: string;

  // giro de la entidad
  @ApiProperty({
    description: 'Giro de la entidad.',
    example: 'Giro de prueba.',
  })
  @IsString()
  @IsNotEmpty({
    message: 'El giro de la entidad es obligatorio.',
  })
  giro: string;

  //tipo de entidad
  @ApiProperty({
    description: 'Tipo de entidad.',
    example: Tipo.P,
    enum: Tipo,
  })
  @IsString()
  @IsNotEmpty({
    message: 'El tipo de entidad es obligatorio.',
  })
  @IsEnum(Tipo, {
    message: 'El tipo de entidad debe ser B, C o P.',
  })
  tipo: string;

  // direccion de la entidad
  @ApiProperty({
    description: 'Dirección de la entidad.',
    example: 'Dirección de prueba.',
  })
  @IsString()
  @IsNotEmpty({
    message: 'La dirección de la entidad es obligatoria.',
  })
  direccion: string;

  // telefono de la entidad
  @ApiProperty({
    description: 'Telefono de la entidad.',
    example: 912345678,
  })
  @Min(100000000, {
    message: 'El telefono de la entidad debe ser un número de 9 dígitos.',
  })
  @Max(999999999, {
    message: 'El telefono de la entidad debe ser un número de 9 dígitos.',
  })
  @IsNumber(
    {},
    {
      message: 'El telefono de la entidad debe ser un número.',
    },
  )
  @IsNotEmpty({
    message: 'El telefono de la entidad es obligatorio.',
  })
  telefono: number;

  // email de la entidad
  @ApiProperty({
    description: 'Email de la entidad.',
    example: 'cidybadilla@gmail.com',
  })
  @IsString()
  @IsNotEmpty({
    message: 'El email de la entidad es obligatorio.',
  })
  mail: string;

  // id comuna de la entidad
  @ApiProperty({
    description: 'Id comuna de la entidad.',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty({
    message: 'El id de la comuna de la entidad es obligatorio.',
  })
  id_comuna: number;
}
