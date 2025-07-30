import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Products } from './entities/products.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { HttpModule } from '@nestjs/axios';
import { MercadoLibreModule } from '../mercado-libre/mercado-libre.module';
import { GoogleLoggingService } from 'src/common/services/google-logging.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Products, Notification]),
    HttpModule,
    MercadoLibreModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService, NotificationsService, GoogleLoggingService],
})
export class ProductsModule {}
