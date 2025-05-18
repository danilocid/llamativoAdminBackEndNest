import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetCodeDto } from './dto/get-code.dto';
import { MercadoLibreService } from './mercado-libre.service';
import { MercadoLibreAuthService } from './mercado-libre-auth.service';

@Controller('mercado-libre')
@ApiTags('Mercado Libre')
export class MercadoLibreController {
  constructor(
    private readonly mercadoLibreService: MercadoLibreService,
    private readonly mercadoLibreAuthService: MercadoLibreAuthService,
  ) {}

  @Get()
  async getAuthCode(@Query() query: GetCodeDto) {
    return this.mercadoLibreAuthService.getAuthCode(query);
  }
  @Get('list-products')
  async listProducts() {
    return this.mercadoLibreService.listProducts();
  }
}
