import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PurchasesService } from './purchases.service';
import { GetPurchasesDto } from './dto/get-purchases.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { CreatePurchaseDto } from './dto/create-purchase.dto';

@Controller('purchases')
@ApiTags('Purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get()
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getAllPurchases(@Query() t: GetPurchasesDto) {
    return await this.purchasesService.getAllPurchases(t);
  }

  @Get('report')
  /*  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard) */
  async getReport(@Query() t: GetPurchasesDto) {
    return await this.purchasesService.getReport(t);
  }

  @Get('types')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getTypes() {
    return await this.purchasesService.getTypes();
  }

  @Get('sincronizar')
  @ApiQuery({ name: 'mes', required: false, type: Number, description: 'Mes a sincronizar (1-12). Default: mes actual' })
  @ApiQuery({ name: 'anio', required: false, type: Number, description: 'Año a sincronizar. Default: año actual' })
  async sincronizar(
    @Query('mes') mes?: number,
    @Query('anio') anio?: number,
  ) {
    const now = new Date();
    const mesFinal = mes || now.getMonth() + 1;
    const anioFinal = anio || now.getFullYear();

    this.purchasesService.scrapeAndSavePurchases(mesFinal, anioFinal);
    return {
      serverResponseCode: 202,
      serverResponseMessage: `Sincronización del RCV iniciada para ${mesFinal}/${anioFinal}. El proceso se ejecuta en segundo plano.`,
    };
  }

  @Post('edit/:id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async editPurchase(@Param('id') id: number, @Body() t: UpdatePurchaseDto) {
    return await this.purchasesService.editPurchase(id, t);
  }

  @Post('create')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async createPurchase(@Body() createPurchaseDto: CreatePurchaseDto) {
    return await this.purchasesService.createPurchase(createPurchaseDto);
  }
}
