import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ReportDataTypeDto } from './dto/report-data-type.dto';
import { InsertReportDataDto } from './dto/insert-report-data.dto';

@Controller('reports')
@ApiTags('Reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  //get report data

  // get monthly sales
  @Get('monthly-sales/:month/:year')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ApiParam({
    name: 'month',
    description: 'Month number',
    example: 1,
  })
  @ApiParam({
    name: 'year',
    description: 'Year number',
    example: 2021,
  })
  async getMonthlySales(@Param() t: any) {
    return await this.reportsService.getMonthlySales(t.month, t.year);
  }

  // get report data types
  @Get('data-types')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ApiQuery({
    name: 'activo',
    description: 'Active status',
    example: 1,
  })
  async getReportDataTypes(@Query() t: any) {
    return await this.reportsService.getReportDataTypes(t.activo);
  }

  //create report data type
  @Post('data-types')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ApiBody({ type: ReportDataTypeDto })
  async createReportDataType(@Body() body: ReportDataTypeDto) {
    return await this.reportsService.createReportDataType(body);
  }

  // update report data type
  @Patch('data-types/:id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ApiBody({ type: ReportDataTypeDto })
  @ApiParam({
    name: 'id',
    description: 'Report data type id',
    example: 1,
  })
  async updateReportDataType(@Param() t: any, @Body() body: ReportDataTypeDto) {
    return await this.reportsService.updateReportDataType(t.id, body);
  }

  @Get('data/:month/:year')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ApiParam({
    name: 'month',
    description: 'Month number',
    example: 1,
  })
  @ApiParam({
    name: 'year',
    description: 'Year number',
    example: 2021,
  })
  async getReportData(@Param() t: any) {
    return await this.reportsService.getReportData(t.month, t.year);
  }

  @Post('data')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ApiBody({ type: InsertReportDataDto })
  async insertReportData(@Body() body: InsertReportDataDto) {
    return await this.reportsService.insertReportData(body);
  }
}
