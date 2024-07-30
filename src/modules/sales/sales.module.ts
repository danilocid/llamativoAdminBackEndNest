import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sales } from './entities/sales.entity';
import { SalesDetails } from './entities/sales-details.entity';
import { Entities } from '../entities/entities/entities.entity';
import { DocumentType } from '../common/entities/document_type.entity';
import { PaymentMethod } from '../common/entities/payment_method.entity';
import { Products } from '../products/entities/products.entity';
import { ProductMovementDetail } from '../products-movements/entities/product_movement_detail.entity';
import { ProductMovementType } from '../products-movements/entities/product_movement_type.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Sales,
      SalesDetails,
      Entities,
      DocumentType,
      PaymentMethod,
      Products,
      ProductMovementDetail,
      ProductMovementType,
    ]),
  ],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
