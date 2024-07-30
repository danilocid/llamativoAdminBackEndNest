import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonController } from './common.controller';
import { CommonService } from './common.service';
import { PaymentMethod } from './entities/payment_method.entity';
import { DocumentType } from './entities/document_type.entity';
import { Sales } from '../sales/entities/sales.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentMethod, DocumentType, Sales])],
  controllers: [CommonController],
  providers: [CommonService],
})
export class CommonModule {}
