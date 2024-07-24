import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sales } from './entities/sales.entity';
import { SalesDetails } from './entities/sales-details.entity';
@Module({
  imports: [TypeOrmModule.forFeature([Sales, SalesDetails])],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
