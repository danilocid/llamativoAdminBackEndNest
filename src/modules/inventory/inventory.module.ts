import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';

import { InventoryController } from './inventory.controller';

import { Inventory } from './entities/inventory.entity';
import { InventoryService } from './inventory.service';
import { InventoryDetails } from './entities/inventory-details.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Inventory, InventoryDetails])],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
