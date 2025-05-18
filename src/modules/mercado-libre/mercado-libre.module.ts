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

@Module({
  imports: [
    TypeOrmModule.forFeature([MercadoLibreToken, Products, Notification]),
    HttpModule,
  ],
  controllers: [MercadoLibreController],
  providers: [
    MercadoLibreService,
    GoogleLoggingService,
    MercadoLibreAuthService,
  ],
  exports: [MercadoLibreService, MercadoLibreAuthService, GoogleLoggingService],
})
export class MercadoLibreModule {}
