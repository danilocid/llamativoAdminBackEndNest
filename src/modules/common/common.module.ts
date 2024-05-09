import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonController } from './common.controller';
import { CommonService } from './common.service';
import { PaymentMethod } from './entities/payment_method.entity';
import { DocumentType } from './entities/document_type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentMethod, DocumentType])],
  controllers: [CommonController],
  providers: [CommonService],
})
export class CommonModule {}
