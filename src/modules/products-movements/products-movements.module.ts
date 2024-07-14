import { Module } from '@nestjs/common';
import { ProductsMovementsController } from './products-movements.controller';
import { ProductsMovementsService } from './products-movements.service';
import { ProductMovementType } from './entities/product_movement_type.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductMovementDetail } from './entities/product_movement_detail.entity';
import { Products } from '../products/entities/products.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductMovementType,
      Products,
      ProductMovementDetail,
    ]),
  ],
  controllers: [ProductsMovementsController],
  providers: [ProductsMovementsService],
})
export class ProductsMovementsModule {}
