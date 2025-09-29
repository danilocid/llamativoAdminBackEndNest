import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { PurchasesTypes } from './entities/purchases-types.entity';
import { Purchases } from './entities/purchases.entity';
import { Entities } from '../entities/entities/entities.entity';
import { DocumentType } from '../common/entities/document_type.entity';
import { GoogleLoggingService } from 'src/common/services/google-logging.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchasesTypes,
      Purchases,
      Entities,
      DocumentType,
    ]),
  ],
  controllers: [PurchasesController],
  providers: [PurchasesService, GoogleLoggingService],
})
export class PurchasesModule {}
