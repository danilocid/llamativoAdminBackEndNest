import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { GetInventoryDto } from './dto/get.dto';
import { SaveInventoryDto } from './dto/save-inventory.dto';
import { SubmitCountDto } from './dto/submit-count.dto';

@Controller('inventories')
@ApiTags('Inventories')
export class InventoryController {
  constructor(private readonly inventoriesService: InventoryService) {}

  // get all inventories
  @Get()
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getAllInventories(@Query() t: GetInventoryDto) {
    return await this.inventoriesService.getAllInventory(t);
  }

  // get next product to count (random)
  @Get('random-count')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getNextProductToCount() {
    return await this.inventoriesService.getNextProductToCount();
  }

  // get inventory report by month and year
  @Get('report/:month/:year')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getInventoryReport(
    @Param('month') month: number,
    @Param('year') year: number,
  ) {
    return await this.inventoriesService.getInventoryReportByMonth(month, year);
  }

  // submit random count result
  @Post('random-count')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async submitRandomCount(@Body() dto: SubmitCountDto, @Req() req: any) {
    return await this.inventoriesService.submitRandomCount(dto, req.user.id);
  }

  // get inventory by id
  @Get(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getInventoryById(@Param() t: any) {
    return await this.inventoriesService.getInventoryById(t);
  }

  // save inventory
  @Post()
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async saveInventory(@Body() t: SaveInventoryDto) {
    return await this.inventoriesService.saveInventory(t);
  }
}
