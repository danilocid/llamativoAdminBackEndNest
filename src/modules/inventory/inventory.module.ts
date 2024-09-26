import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';

import { InventoryController } from './inventory.controller';

import { Inventory } from './entities/inventory.entity';
import { InventoryService } from './inventory.service';
import { InventoryDetails } from './entities/inventory-details.entity';
import { Products } from '../products/entities/products.entity';
import { ProductMovementDetail } from '../products-movements/entities/product_movement_detail.entity';
import { ProductMovementType } from '../products-movements/entities/product_movement_type.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Inventory,
      InventoryDetails,
      Products,
      ProductMovementDetail,
      ProductMovementType,
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
