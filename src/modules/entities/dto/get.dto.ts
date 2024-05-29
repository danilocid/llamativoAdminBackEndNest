import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { PageDto } from 'src/common/dto/page.dto';

export class GetEntitiesDto extends PageDto {
  @ApiProperty({
    description: 'Tipo de entidad',
    example: 'b',
    default: 'b',
  })
  @IsOptional()
  readonly t?: string;
}
