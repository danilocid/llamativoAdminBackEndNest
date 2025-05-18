import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { DatabaseModule } from './common/config/database.module';
import { ConfigModule } from '@nestjs/config';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { APP_FILTER } from '@nestjs/core/constants';
import { HttpExceptionFilter } from './common/exceptions/http-exception.filter';
import { CommonModule } from './modules/common/common.module';
import { EntitiesModule } from './modules/entities/entities.module';
import { ProductsModule } from './modules/products/products.module';
import { ProductsMovementsModule } from './modules/products-movements/products-movements.module';
import { SalesModule } from './modules/sales/sales.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { ReportsModule } from './modules/reports/reports.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ReceptionsModule } from './modules/receptions/receptions.module';
import { MercadoLibreModule } from './modules/mercado-libre/mercado-libre.module';
import { GoogleLoggingService } from './common/services/google-logging.service';

@Module({
  imports: [
    AuthModule,
    CommonModule,
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    EntitiesModule,
    InventoryModule,
    NotificationsModule,
    ProductsModule,
    ProductsMovementsModule,
    PurchasesModule,
    ReceptionsModule,
    ReportsModule,
    SalesModule,
    MercadoLibreModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    GoogleLoggingService,
  ],
  exports: [GoogleLoggingService],
})
export class AppModule {}
