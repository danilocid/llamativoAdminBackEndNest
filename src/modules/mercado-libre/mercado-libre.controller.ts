import { Controller, Get, Param, Post, Body, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiQuery, ApiBody } from '@nestjs/swagger';
import { GetCodeDto } from './dto/get-code.dto';
import { AsociarVentaMlDto } from './dto/asociar-venta-ml.dto';
import { VincularVentaExistenteDto } from './dto/vincular-venta-existente.dto';
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

  @Get('list-sales')
  async listSales() {
    return this.mercadoLibreService.listSales();
  }

  @Get('sync-sales')
  async syncSales() {
    return this.mercadoLibreService.syncSales();
  }

  @Get('ventas-ml/:id')
  async getVentaMlById(@Param('id', ParseIntPipe) id: number) {
    return this.mercadoLibreService.getVentaMlById(id);
  }

  @Post('ventas-ml/asociar')
  @ApiBody({ type: AsociarVentaMlDto })
  async asociarVentaMl(@Body() dto: AsociarVentaMlDto) {
    return this.mercadoLibreService.asociarVentaMl(dto);
  }

  @Post('ventas-ml/vincular')
  @ApiBody({ type: VincularVentaExistenteDto })
  async vincularVentaExistente(@Body() dto: VincularVentaExistenteDto) {
    return this.mercadoLibreService.vincularVentaExistente(dto);
  }

  @Get('ventas-ml')
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Cantidad por página (default: 10)' })
  @ApiQuery({ name: 'estado', required: false, type: String, description: 'Filtrar por estado (paid, delivered, cancelled, etc.)' })
  @ApiQuery({ name: 'asociada', required: false, type: String, description: 'Filtrar por asociación: true = asociadas, false = sin asociar' })
  async getVentasMl(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('estado') estado?: string,
    @Query('asociada') asociada?: string,
  ) {
    return this.mercadoLibreService.getVentasMl(
      page || 1,
      limit || 10,
      estado,
      asociada,
    );
  }
}
