import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

import { ProductsMovementsService } from './products-movements.service';

@Controller('products-movements')
@ApiTags('Products movements')
export class ProductsMovementsController {
  constructor(
    private readonly productsMovementsService: ProductsMovementsService,
  ) {}

  // get all products movements types
  @Get('types')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getAllProductsMovementsTypes() {
    return await this.productsMovementsService.getAllProductsMovementsTypes();
  }

  @Get(':productId')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ApiParam({ name: 'productId', type: Number })
  async getAllProductsMovements(@Param('productId') productId: number) {
    return await this.productsMovementsService.getAllProductsMovements(
      productId,
    );
  }
}
