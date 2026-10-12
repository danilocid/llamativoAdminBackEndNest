import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  Min,
  IsIn,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class ListWoocommerceProductsDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  per_page?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['any', 'publish', 'draft', 'pending', 'private'])
  status?: string = 'any';

  /**
   * Aplica los cambios de precio y stock a WooCommerce, tomando la base de
   * datos como fuente de verdad. Viene activado por defecto; pase `false` para
   * obtener solo la comparación sin escribir en la tienda.
   */
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) =>
    value === undefined ? true : String(value).toLowerCase() !== 'false',
  )
  sincronizar?: boolean = true;
}
