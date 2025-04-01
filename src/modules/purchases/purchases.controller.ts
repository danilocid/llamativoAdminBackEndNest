import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PurchasesService } from './purchases.service';
import { GetPurchasesDto } from './dto/get-purchases.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';

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

  @Get('api')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async createPurchaseFromApi(@Query() t: GetPurchasesDto) {
    this.purchasesService.createPurchaseFromApi(t);
    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Purchases created successfully',
    };
  }

  @Post('edit/:id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async editPurchase(@Param('id') id: number, @Body() t: UpdatePurchaseDto) {
    return await this.purchasesService.editPurchase(id, t);
  }
}
