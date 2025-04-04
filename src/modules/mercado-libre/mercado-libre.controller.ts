import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetCodeDto } from './dto/get-code.dto';
import { MercadoLibreService } from './mercado-libre.service';

@Controller('mercado-libre')
@ApiTags('Mercado Libre')
export class MercadoLibreController {
  constructor(private readonly mercadoLibreService: MercadoLibreService) {}

  @Get()
  async getAuthCode(@Query() query: GetCodeDto) {
    return this.mercadoLibreService.getAuthCode(query);
  }
}
