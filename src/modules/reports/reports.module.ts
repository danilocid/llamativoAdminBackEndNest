import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { Sales } from '../sales/entities/sales.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportDataType } from './entities/report-data-type.entity';
import { ReportData } from './entities/report-data.entity';
import { GoogleLoggingService } from 'src/common/services/google-logging.service';

@Module({
  imports: [TypeOrmModule.forFeature([Sales, ReportDataType, ReportData])],
  controllers: [ReportsController],
  providers: [ReportsService, GoogleLoggingService],
})
export class ReportsModule {}
