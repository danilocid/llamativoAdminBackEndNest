import { InjectRepository } from '@nestjs/typeorm';
import { PageDto } from 'src/common/dto/page.dto';
import { Reception } from './entities/reception.entity';
import { Repository } from 'typeorm';
import { ReceptionDetails } from './entities/reception-details.entity';
import { CreateReceptionDto } from './dto/create-reception.dto';
import { Entities } from '../entities/entities/entities.entity';
import { NotFoundException } from '@nestjs/common';
import { DocumentType } from '../common/entities/document_type.entity';
import { ProductMovementType } from '../products-movements/entities/product_movement_type.entity';
import { Products } from '../products/entities/products.entity';
import { ProductMovementDetail } from '../products-movements/entities/product_movement_detail.entity';

export class ReceptionsService {
  constructor(
    @InjectRepository(Reception)
    private receptionRepository: Repository<Reception>,
    @InjectRepository(ReceptionDetails)
    private receptionDetailsRepository: Repository<ReceptionDetails>,
    @InjectRepository(Entities)
    private entitiesRepository: Repository<Entities>,
    @InjectRepository(DocumentType)
    private documentTypeRepository: Repository<DocumentType>,
    @InjectRepository(ProductMovementType)
    private productMovementTypeRepository: Repository<ProductMovementType>,
    @InjectRepository(Products)
    private productsRepository: Repository<Products>,
    @InjectRepository(ProductMovementDetail)
    private productMovementDetailRepository: Repository<ProductMovementDetail>,
  ) {}
  async getAllReceptions(t: PageDto) {
    //get all receptions
    const skippedItems = (t.page - 1) * 10;
    const param = t.param || '';
    const queryBuilder =
      this.receptionRepository.createQueryBuilder('reception');
    if (param) {
      queryBuilder.where('reception.proveedor LIKE :param', {
        param: `%${param}%`,
      });
      queryBuilder.orWhere('reception.documento LIKE :param', {
        param: `%${param}%`,
      });
    }
    queryBuilder.orderBy('reception.fecha', 'DESC');
    queryBuilder.leftJoinAndSelect('reception.proveedor', 'Proveedor');
    queryBuilder.leftJoinAndSelect('reception.tipo_documento', 'TipoDocumento');
    queryBuilder.skip(skippedItems);
    queryBuilder.take(10);
    const [result, total] = await queryBuilder.getManyAndCount();
    return {
      data: result,
      total: total,
      page: t.page,
    };
  }

  async getReceptionById(id: number) {
    //get reception by id
    const queryBuilder =
      this.receptionRepository.createQueryBuilder('reception');
    queryBuilder.where('reception.id = :id', { id: id });
    queryBuilder.leftJoinAndSelect('reception.proveedor', 'Proveedor');
    queryBuilder.leftJoinAndSelect('reception.tipo_documento', 'TipoDocumento');

    const reception = await queryBuilder.getOne();
    if (!reception) {
      throw new Error('Reception not found');
    }

    const details = await this.receptionDetailsRepository.find({
      where: { recepcion: reception },
      relations: ['producto'],
    });

    return {
      reception: reception,
      details: details,
    };
  }

  async createReception(t: CreateReceptionDto) {
    //create reception
    const reception = new Reception();
    //validate entity
    const entity = await this.entitiesRepository.findOne({
      where: { rut: t.rut },
    });
    if (!entity) {
      throw new NotFoundException('Entity not found');
    }
    reception.proveedor = entity;
    //validate document type
    const documentType = await this.documentTypeRepository.findOne({
      where: { id: t.tipoDocumento },
    });
    if (!documentType) {
      throw new NotFoundException('Document type not found');
    }
    reception.tipo_documento = documentType;
    reception.documento = t.documento;
    reception.costo_imp = t.totalCostoImp;
    reception.costo_neto = t.totalCostoNeto;
    reception.unidades = t.totalUnidades;
    reception.fecha = new Date();

    //save reception
    await this.receptionRepository.save(reception);
    const productMovementType =
      await this.productMovementTypeRepository.findOne({
        where: { tipo_movimiento: 'recepcion' },
      });
    //save reception details
    for (const product of t.products) {
      const detail = new ReceptionDetails();
      detail.recepcion = reception;
      detail.producto = await this.productsRepository.findOne({
        where: { id: product.id },
      });
      detail.unidades = product.unidades;

      detail.costo_neto = product.costo_neto;
      detail.costo_imp = product.costo_imp;
      await this.receptionDetailsRepository.save(detail);
      //update the stock of the product
      detail.producto.stock = detail.producto.stock + product.unidades;
      await this.productsRepository.save(detail.producto);
      // save the product movement
      const productMovementDetail = new ProductMovementDetail();
      productMovementDetail.producto = detail.producto;
      productMovementDetail.cantidad = product.unidades;
      productMovementDetail.createdAt = new Date();
      productMovementDetail.movimiento = productMovementType;
      productMovementDetail.id_movimiento = reception.id;
      await this.productMovementDetailRepository.save(productMovementDetail);
    }
    return {
      data: 'Reception created',
    };
  }
}
