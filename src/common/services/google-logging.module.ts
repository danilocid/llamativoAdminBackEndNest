import { Module, Global } from '@nestjs/common';
import { GoogleLoggingService } from './google-logging.service';

@Global()
@Module({
  providers: [GoogleLoggingService],
  exports: [GoogleLoggingService],
})
export class GoogleLoggingModule {}
