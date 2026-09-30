import { Module } from '@nestjs/common';
import { MercadoLibreController } from './mercado-libre.controller';
import { MercadoLibreService } from './mercado-libre.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MercadoLibreToken } from './entities/mercado-libre.entity';
import { VentaMl } from './entities/venta-ml.entity';
import { DetalleVentaMl } from './entities/detalle-venta-ml.entity';
import { HttpModule } from '@nestjs/axios';
import { GoogleLoggingService } from 'src/common/services/google-logging.service';
import { Products } from '../products/entities/products.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { MercadoLibreAuthService } from './mercado-libre-auth.service';
import { ProductSyncService } from './product-sync.service';
import { Sales } from '../sales/entities/sales.entity';
import { SalesDetails } from '../sales/entities/sales-details.entity';
import { SalesExtraCosts } from '../sales/entities/sales-extra-costs.entity';
import { SalesExtraCostDetails } from '../sales/entities/sales-extra-cost-details.entity';
import { Entities } from '../entities/entities/entities.entity';
import { DocumentType } from '../common/entities/document_type.entity';
import { PaymentMethod } from '../common/entities/payment_method.entity';
import { ProductMovementDetail } from '../products-movements/entities/product_movement_detail.entity';
import { ProductMovementType } from '../products-movements/entities/product_movement_type.entity';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      MercadoLibreToken, Products, Notification, VentaMl, DetalleVentaMl,
      Sales, SalesDetails, SalesExtraCosts, SalesExtraCostDetails,
      Entities, DocumentType, PaymentMethod,
      ProductMovementDetail, ProductMovementType,
    ]),
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
