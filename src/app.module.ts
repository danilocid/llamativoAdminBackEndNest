import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { DatabaseModule } from './common/config/database.module';
import { ConfigModule } from '@nestjs/config';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { APP_FILTER } from '@nestjs/core/constants';
import { HttpExceptionFilter } from './common/exceptions/http-exception.filter';
import { IssuesModule } from './modules/issues/issues.module';
import { CommonModule } from './modules/common/common.module';
import { EntitiesModule } from './modules/entities/entities.module';
import { ProductsModule } from './modules/products/products.module';
import { ProductsMovementsModule } from './modules/products-movements/products-movements.module';

@Module({
  imports: [
    AuthModule,
    CommonModule,
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    EntitiesModule,
    IssuesModule,
    NotificationsModule,
    ProductsModule,
    ProductsMovementsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
