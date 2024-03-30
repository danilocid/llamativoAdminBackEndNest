import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { DatabaseModule } from './common/config/database.module';
import { ConfigModule } from '@nestjs/config';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { APP_FILTER } from '@nestjs/core/constants';
import { HttpExceptionFilter } from './common/exceptions/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    DatabaseModule,
    NotificationsModule,
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
