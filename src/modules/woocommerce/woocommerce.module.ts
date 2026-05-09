import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WoocommerceController } from './woocommerce.controller';
import { WoocommerceService } from './woocommerce.service';
import { Products } from '../products/entities/products.entity';
import { GoogleLoggingModule } from 'src/common/services/google-logging.module';
import { MercadoLibreModule } from '../mercado-libre/mercado-libre.module';
import { Notification } from '../notifications/entities/notification.entity';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Products, Notification]),
    GoogleLoggingModule,
    MercadoLibreModule,
  ],
  controllers: [WoocommerceController],
  providers: [WoocommerceService],
  exports: [WoocommerceService],
})
export class WoocommerceModule {}
