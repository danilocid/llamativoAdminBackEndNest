import { Module } from '@nestjs/common';
import { MercadoLibreController } from './mercado-libre.controller';
import { MercadoLibreService } from './mercado-libre.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MercadoLibreToken } from './entities/mercado-libre.entity';
import { HttpModule } from '@nestjs/axios';
import { GoogleLoggingService } from 'src/common/services/google-logging.service';
import { Products } from '../products/entities/products.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { MercadoLibreAuthService } from './mercado-libre-auth.service';
import { ProductSyncService } from './product-sync.service';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([MercadoLibreToken, Products, Notification]),
  ],
  controllers: [MercadoLibreController],
  providers: [
    MercadoLibreService,
    MercadoLibreAuthService,
    ProductSyncService,
    GoogleLoggingService,
  ],
  exports: [MercadoLibreService, MercadoLibreAuthService, ProductSyncService],
})
export class MercadoLibreModule {}
