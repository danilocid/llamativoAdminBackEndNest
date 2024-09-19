import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { GetInventoryDto } from './dto/get.dto';

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

  // get inventory by id
  @Get(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getInventoryById(@Param() t: any) {
    return await this.inventoriesService.getInventoryById(t);
  }
}
