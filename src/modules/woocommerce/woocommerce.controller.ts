import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WoocommerceService } from './woocommerce.service';
import { ListWoocommerceProductsDto } from './dto/list-woocommerce-products.dto';

@ApiTags('woocommerce')
@ApiBearerAuth()
@Controller('woocommerce')
export class WoocommerceController {
  constructor(private readonly woocommerceService: WoocommerceService) {}

  @Get('products')
  //  @UseGuards(JwtAuthGuard)
  listProducts(@Query() t: ListWoocommerceProductsDto) {
    return this.woocommerceService.listProducts(t);
  }

  @Post('products/sync-from-mercado-libre')
  syncPublishedProductFromMercadoLibre() {
    return this.woocommerceService.syncPublishedProductFromMercadoLibre();
  }
}
