import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { SalesService } from './sales.service';
import { GetSalesDto } from './dto/get.dto';
@Controller('sales')
@ApiTags('Sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}
  // get all sales
  @Get()
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getAllSales(@Query() t: GetSalesDto) {
    return await this.salesService.getAllSales(t);
  }

  // get a sale by id
  @Get(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getSaleById(@Param('id') id: number) {
    return await this.salesService.getSaleById(id);
  }
}
