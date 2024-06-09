import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { PageDto } from 'src/common/dto/page.dto';

export class GetProductsDto extends PageDto {
  @ApiProperty({
    description: 'Stock',
    example: 'true',
    default: 'true',
  })
  @IsOptional()
  readonly stock?: string;

  @ApiProperty({
    description: 'Activo',
    example: 'true',
    default: 'true',
  })
  @IsOptional()
  readonly active?: string;

  @ApiProperty({
    description: 'Todos los productos',
    example: 'false',
    default: 'false',
  })
  @IsOptional()
  readonly all?: string;
}
