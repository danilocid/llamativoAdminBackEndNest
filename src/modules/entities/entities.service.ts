import { InjectRepository } from '@nestjs/typeorm';
import { Region } from './entities/regions.entity';
import { Repository, Like } from 'typeorm';
import { Comune } from './entities/comunas.entity';
import { Entities } from './entities/entities.entity';
import { CreateEntityDto } from './dto/create-entity.dto';
import { GetEntitiesDto } from './dto/get.dto';

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
  async getAllEntities(t: GetEntitiesDto) {
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
      //where.push({ rut: t.param });
    }
    if (t.order != '' && t.order != undefined) {
      // if query.order have a . then it is a relation, so we need to split it
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
      data: entities,
      count,
    };
  }

  //get all regions
  async getAllRegions() {
    const regions = await this.regionRepository.find();
    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Regiones obtenidas.',
      data: regions,
    };
  }

  //get all communes
  async getAllCommunesByRegionId(idRegion: number) {
    const region = await this.regionRepository.findOne({
      where: { id: idRegion },
    });
    if (!region) {
      return {
        serverResponseCode: 404,
        serverResponseMessage: 'Región no encontrada.',
        data: null,
      };
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
  async getEntityByRut(rut: string) {
    const entity = await this.entitiesRepository.findOne({
      where: { rut: rut },
      relations: ['comuna', 'comuna.region'],
    });
    if (!entity) {
      return {
        serverResponseCode: 404,
        serverResponseMessage: 'Entidad no encontrada.',
        data: null,
      };
    }
    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Entidad obtenida.',
      data: entity,
    };
  }

  //create entity
  async createEntity(entity: CreateEntityDto) {
    // check if entity already exists
    let newEntity = await this.entitiesRepository.findOne({
      where: { rut: entity.rut },
    });
    if (newEntity) {
      return {
        serverResponseCode: 400,
        serverResponseMessage: 'Ya existe una entidad con ese rut.',
        data: null,
      };
    }

    // check if comune exists
    const comune = await this.comuneRepository.findOne({
      where: { id: entity.id_comuna },
    });

    if (!comune) {
      return {
        serverResponseCode: 404,
        serverResponseMessage: 'Comuna no encontrada.',
        data: null,
      };
    }
    newEntity = { ...entity, comuna: comune };
    try {
      await this.entitiesRepository.save(newEntity);
    } catch (error) {
      return {
        serverResponseCode: 400,
        serverResponseMessage: 'Error al crear la entidad.',
        data: error,
      };
    }
    return {
      serverResponseCode: 201,
      serverResponseMessage: 'Entidad creada.',
      data: newEntity,
    };
  }

  //update entity
  async updateEntity(entity: CreateEntityDto) {
    // check if entity exists
    let newEntity = await this.entitiesRepository.findOne({
      where: { rut: entity.rut },
    });
    if (!newEntity) {
      return {
        serverResponseCode: 404,
        serverResponseMessage: 'Entidad no encontrada.',
        data: null,
      };
    }

    // check if rut exists
    if (entity.rut !== newEntity.rut) {
      const entityExists = await this.entitiesRepository.findOne({
        where: { rut: entity.rut },
      });
      if (entityExists) {
        return {
          serverResponseCode: 400,
          serverResponseMessage: 'Ya existe una entidad con ese rut.',
          data: null,
        };
      }
    }

    // check if comune exists
    const comune = await this.comuneRepository.findOne({
      where: { id: entity.id_comuna },
    });

    if (!comune) {
      return {
        serverResponseCode: 404,
        serverResponseMessage: 'Comuna no encontrada.',
        data: null,
      };
    }
    newEntity = { ...entity, comuna: comune };
    try {
      await this.entitiesRepository.save(newEntity);
    } catch (error) {
      return {
        serverResponseCode: 400,
        serverResponseMessage: 'Error al actualizar la entidad.',
        data: error,
      };
    }
    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Entidad actualizada.',
      data: newEntity,
    };
  }
}
