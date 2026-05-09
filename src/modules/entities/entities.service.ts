import { InjectRepository } from '@nestjs/typeorm';
import { Region } from './entities/regions.entity';
import { Repository, Like } from 'typeorm';
import { Comune } from './entities/comunas.entity';
import { Entities } from './entities/entities.entity';
import { CreateEntityDto } from './dto/create-entity.dto';
import { GetEntitiesDto } from './dto/get.dto';
import { ResponseDto } from 'src/common/dto/response.dto';
import {
  NotFoundException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class EntitiesService {
  constructor(
    @InjectRepository(Region)
    private regionRepository: Repository<Region>,
    @InjectRepository(Comune)
    private comuneRepository: Repository<Comune>,
    @InjectRepository(Entities)
    private entitiesRepository: Repository<Entities>,
  ) {}

  //get all entities
  async getAllEntities(t: GetEntitiesDto): Promise<ResponseDto> {
    const skippedItems = (t.page - 1) * 10;
    const where = [];
    let order = {};
    const sort = t.sort;
    const columnt: string = t.order;

    if (t.t !== undefined && t.t !== 'b') {
      where.push({ tipo: t.t });
      where.push({ tipo: 'B' });
    }
    if (t.param != '' && t.param != undefined) {
      where.push(
        { nombre: Like(`%${t.param}%`) },
        { rut: Like(`%${t.param}%`) },
      );
    }
    if (t.order != '' && t.order != undefined) {
      const condition = columnt.includes('.');
      if (condition) {
        const [relation, column] = columnt.split('.');
        order = {
          [relation]: {
            [column]: sort,
          },
        };
      } else {
        order = {
          [columnt]: sort,
        };
      }
    }
    const [entities, count] = await this.entitiesRepository.findAndCount({
      relations: ['comuna', 'comuna.region'],
      order: order,
      where: where,
      take: 10,
      skip: skippedItems,
    });
    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Entidades obtenidas.',
      data: { entities, count },
    };
  }

  // get all providers (type P and B) for dropdowns
  async getProviders(): Promise<ResponseDto> {
    const providers = await this.entitiesRepository.find({
      where: [{ tipo: 'P' }, { tipo: 'B' }],
      order: { nombre: 'ASC' },
      select: ['rut', 'nombre'],
    });
    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Proveedores obtenidos.',
      data: providers,
    };
  }

  //get all regions
  async getAllRegions(): Promise<ResponseDto> {
    const regions = await this.regionRepository.find();
    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Regiones obtenidas.',
      data: regions,
    };
  }

  //get all communes
  async getAllCommunesByRegionId(idRegion: number): Promise<ResponseDto> {
    const region = await this.regionRepository.findOne({
      where: { id: idRegion },
    });
    if (!region) {
      throw new NotFoundException('Región no encontrada.');
    }
    const communes = await this.comuneRepository.find({
      where: { region: region },
      relations: ['region'],
    });
    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Comunas obtenidas.',
      data: communes,
    };
  }

  //get entity by rut
  async getEntityByRut(rut: string): Promise<ResponseDto> {
    const entity = await this.entitiesRepository.findOne({
      where: { rut: rut },
      relations: ['comuna', 'comuna.region'],
    });
    if (!entity) {
      throw new NotFoundException('Entidad no encontrada.');
    }
    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Entidad obtenida.',
      data: entity,
    };
  }

  //create entity
  async createEntity(entity: CreateEntityDto): Promise<ResponseDto> {
    // check if entity already exists
    let newEntity = await this.entitiesRepository.findOne({
      where: { rut: entity.rut },
    });
    if (newEntity) {
      throw new BadRequestException('Ya existe una entidad con ese rut.');
    }
    // check if comune exists
    const comune = await this.comuneRepository.findOne({
      where: { id: entity.id_comuna },
    });
    if (!comune) {
      throw new NotFoundException('Comuna no encontrada.');
    }
    newEntity = { ...entity, comuna: comune };
    try {
      await this.entitiesRepository.save(newEntity);
    } catch (error) {
      throw new BadRequestException('Error al crear la entidad.');
    }
    return {
      serverResponseCode: 201,
      serverResponseMessage: 'Entidad creada.',
      data: newEntity,
    };
  }

  //update entity
  async updateEntity(entity: CreateEntityDto): Promise<ResponseDto> {
    // check if entity exists
    let newEntity = await this.entitiesRepository.findOne({
      where: { rut: entity.rut },
    });
    if (!newEntity) {
      throw new NotFoundException('Entidad no encontrada.');
    }
    // check if rut exists (si se permite cambiar rut, aquí iría la lógica)
    // check if comune exists
    const comune = await this.comuneRepository.findOne({
      where: { id: entity.id_comuna },
    });
    if (!comune) {
      throw new NotFoundException('Comuna no encontrada.');
    }
    newEntity = { ...entity, comuna: comune };
    try {
      await this.entitiesRepository.save(newEntity);
    } catch (error) {
      throw new BadRequestException('Error al actualizar la entidad.');
    }
    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Entidad actualizada.',
      data: newEntity,
    };
  }
}
