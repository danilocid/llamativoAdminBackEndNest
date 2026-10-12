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
  async listProducts(@Query() t: ListWoocommerceProductsDto) {
    // `sincronizar` viene activado por defecto: con `false` solo se compara
    const resultado = await this.woocommerceService.listProducts(t, {
      soloLectura: t.sincronizar === false,
    });

    await this.woocommerceService.notificarCambiosDeSincronizacion(
      resultado.cambios,
    );

    return resultado;
  }

  @Post('products/sync-from-mercado-libre')
  syncPublishedProductFromMercadoLibre() {
    return this.woocommerceService.syncPublishedProductFromMercadoLibre();
  }
}
