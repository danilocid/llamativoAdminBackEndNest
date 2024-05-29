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
import { ApiBearerAuth, ApiBody, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { EntitiesService } from './entities.service';
import { CreateEntityDto } from './dto/create-entity.dto';
import { GetEntitiesDto } from './dto/get.dto';

@Controller('entities')
@ApiTags('Entities')
export class EntitiesController {
  constructor(private readonly entitiesService: EntitiesService) {}
  // get all entities
  @Get()
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getAllEntities(@Query() t: GetEntitiesDto) {
    return await this.entitiesService.getAllEntities(t);
  }

  // get a entity by rut

  // get all regions
  @Get('/regions')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getAllRegions() {
    return await this.entitiesService.getAllRegions();
  }

  // get all communes by id region
  @Get('/communes/:id')
  @ApiBearerAuth('jwt')
  @ApiParam({
    name: 'id',
    description: 'Region id',
    example: 1,
  })
  @UseGuards(JwtAuthGuard)
  async getAllCommunesByRegionId(@Param() id: any) {
    return await this.entitiesService.getAllCommunesByRegionId(id.id);
  }
  @Get(':rut')
  @ApiBearerAuth('jwt')
  @ApiParam({
    name: 'rut',
    description: 'Entity rut',
    example: '11111111-1',
  })
  @UseGuards(JwtAuthGuard)
  async getEntityByRut(@Param() rut: any) {
    return await this.entitiesService.getEntityByRut(rut.rut);
  }

  // create a entity
  @Post()
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ApiBody({
    description: 'Create entity',
    type: CreateEntityDto,
  })
  async createEntity(@Body() entity: CreateEntityDto) {
    return await this.entitiesService.createEntity(entity);
  }

  // update a entity
  @Patch()
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ApiBody({
    description: 'Update a entity',
    type: CreateEntityDto,
  })
  async updateEntity(@Body() entity: CreateEntityDto) {
    return await this.entitiesService.updateEntity(entity);
  }
}
