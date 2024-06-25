import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Products } from './entities/products.entity';
import { Notification } from '../notifications/entities/notification.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Products, Notification])],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
