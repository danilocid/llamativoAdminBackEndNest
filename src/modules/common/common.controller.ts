import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CommonService } from './common.service';

@Controller('common')
@ApiTags('Common')
export class CommonController {
  constructor(private readonly commonService: CommonService) {}
  // get payment methods
  @Get('/payment-methods')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getPaymentMethods() {
    return await this.commonService.getPaymentMethods();
  }
  // get document types
  @Get('/document-types')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getDocumentTypes() {
    return await this.commonService.getDocumentTypes();
  }
}
