import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReceptionsService } from './receptions.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PageDto } from 'src/common/dto/page.dto';
import { CreateReceptionDto } from './dto/create-reception.dto';

@Controller('receptions')
@ApiTags('Receptions')
export class ReceptionsController {
  constructor(private readonly receptionsService: ReceptionsService) {}
  // get all receptions
  @Get()
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getAllReceptions(@Query() t: PageDto) {
    return await this.receptionsService.getAllReceptions(t);
  }

  @Post()
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async createReception(@Body() t: CreateReceptionDto) {
    return await this.receptionsService.createReception(t);
  }

  // get reception by id
  @Get(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getReceptionById(@Param('id') id: number) {
    return await this.receptionsService.getReceptionById(id);
  }
}
