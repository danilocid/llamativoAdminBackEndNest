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
  ApiBody,
  ApiParam,
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { EntitiesService } from './entities.service';
import { CreateEntityDto } from './dto/create-entity.dto';
import { GetEntitiesDto } from './dto/get.dto';

@Controller('entities')
@ApiTags('Entities')
export class EntitiesController {
  constructor(private readonly entitiesService: EntitiesService) {}

  @Get()
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Lista de entidades', type: Object })
  async getAllEntities(@Query() t: GetEntitiesDto) {
    return this.entitiesService.getAllEntities(t);
  }

  @Get('/providers')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 200,
    description: 'Lista de proveedores',
    type: Object,
  })
  async getProviders() {
    return this.entitiesService.getProviders();
  }

  @Get('/regions')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Lista de regiones', type: Object })
  async getAllRegions() {
    return this.entitiesService.getAllRegions();
  }

  @Get('/communes/:id')
  @ApiBearerAuth('jwt')
  @ApiParam({ name: 'id', description: 'Region id', example: 1 })
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Lista de comunas', type: Object })
  async getAllCommunesByRegionId(@Param('id') id: number) {
    return this.entitiesService.getAllCommunesByRegionId(Number(id));
  }

  @Get(':rut')
  @ApiBearerAuth('jwt')
  @ApiParam({ name: 'rut', description: 'Entity rut', example: '11111111-1' })
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Entidad encontrada', type: Object })
  async getEntityByRut(@Param('rut') rut: string) {
    return this.entitiesService.getEntityByRut(rut);
  }

  @Post()
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ApiBody({ description: 'Create entity', type: CreateEntityDto })
  @ApiResponse({ status: 201, description: 'Entidad creada', type: Object })
  async createEntity(@Body() entity: CreateEntityDto) {
    return this.entitiesService.createEntity(entity);
  }

  @Patch()
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ApiBody({ description: 'Update a entity', type: CreateEntityDto })
  @ApiResponse({
    status: 200,
    description: 'Entidad actualizada',
    type: Object,
  })
  async updateEntity(@Body() entity: CreateEntityDto) {
    return this.entitiesService.updateEntity(entity);
  }
}
