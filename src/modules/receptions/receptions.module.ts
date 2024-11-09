import { Module } from '@nestjs/common';
import { ReceptionsController } from './receptions.controller';
import { ReceptionsService } from './receptions.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reception } from './entities/reception.entity';
import { ReceptionDetails } from './entities/reception-details.entity';
import { Entities } from '../entities/entities/entities.entity';
import { DocumentType } from '../common/entities/document_type.entity';
import { ProductMovementType } from '../products-movements/entities/product_movement_type.entity';
import { ProductMovementDetail } from '../products-movements/entities/product_movement_detail.entity';
import { Products } from '../products/entities/products.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Reception,
      ReceptionDetails,
      Entities,
      DocumentType,
      ProductMovementType,
      ProductMovementDetail,
      Products,
    ]),
  ],
  controllers: [ReceptionsController],
  providers: [ReceptionsService],
})
export class ReceptionsModule {}
