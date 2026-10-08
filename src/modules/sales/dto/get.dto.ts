import { PageDto } from 'src/common/dto/page.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class GetSalesDto extends PageDto {
  @ApiProperty({
    description: 'Filtrar ventas: sin_ml = sin venta ML asociada',
    required: false,
  })
  @IsOptional()
  filtro?: string;
}
