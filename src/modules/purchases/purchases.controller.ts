import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiBody, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PurchasesService } from './purchases.service';
import { GetPurchasesDto } from './dto/get-purchases.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { ImportRcvDto } from './dto/import-rcv.dto';
import { ResponseDto } from 'src/common/dto/response.dto';

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

  /**
   * Recibe los registros extraidos del RCV por el servicio de scraping y los
   * persiste en la base de datos (dedupe, proveedores, notificaciones).
   */
  @Post('import')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ApiBody({
    description: 'Registros crudos del RCV enviados por el servicio de scraping',
    type: ImportRcvDto,
  })
  @ApiResponse({ status: 201, description: 'Registros importados', type: ResponseDto })
  @ApiResponse({ status: 401, description: 'Token invalido' })
  async importRcv(@Body() dto: ImportRcvDto): Promise<ResponseDto> {
    return await this.purchasesService.importRcvData(dto);
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
