import { Sales } from './entities/sales.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { GetSalesDto } from './dto/get.dto';
import { NotFoundException } from '@nestjs/common';
import { SalesDetails } from './entities/sales-details.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { Entities } from '../entities/entities/entities.entity';
import { DocumentType } from '../common/entities/document_type.entity';
import { PaymentMethod } from '../common/entities/payment_method.entity';
import { Products } from '../products/entities/products.entity';
import { ProductMovementDetail } from '../products-movements/entities/product_movement_detail.entity';
import { ProductMovementType } from '../products-movements/entities/product_movement_type.entity';
import { SalesExtraCosts } from './entities/sales-extra-costs.entity';
import { SalesExtraCostDetails } from './entities/sales-extra-cost-details.entity';
export class SalesService {
  constructor(
    @InjectRepository(Sales)
    private salesRepository: Repository<Sales>,
    @InjectRepository(SalesDetails)
    private salesDetailsRepository: Repository<SalesDetails>,
    @InjectRepository(Entities)
    private entitiesRepository: Repository<Entities>,
    @InjectRepository(DocumentType)
    private documentTypeRepository: Repository<DocumentType>,
    @InjectRepository(PaymentMethod)
    private paymentMethodRepository: Repository<PaymentMethod>,
    @InjectRepository(Products)
    private productsRepository: Repository<Products>,
    @InjectRepository(ProductMovementDetail)
    private productMovementDetailRepository: Repository<ProductMovementDetail>,
    @InjectRepository(ProductMovementType)
    private productMovementTypeRepository: Repository<ProductMovementType>,
    @InjectRepository(SalesExtraCosts)
    private salesExtraCostsRepository: Repository<SalesExtraCosts>,
    @InjectRepository(SalesExtraCostDetails)
    private salesExtraCostsDetailsRepository: Repository<SalesExtraCostDetails>,
  ) {}
  async getAllSales(t: GetSalesDto) {
    const skippedItems = (t.page - 1) * 10;
    const sort = t.sort;
    const columnt: string = t.order;

    // Create a query builder
    const queryBuilder = this.salesRepository.createQueryBuilder('ventas');

    // Add relation to query builder
    queryBuilder.leftJoinAndSelect('ventas.cliente', 'cliente');
    queryBuilder.leftJoinAndSelect('ventas.tipo_documento', 'tipo_documento');
    queryBuilder.leftJoinAndSelect('ventas.medio_pago', 'medio_pago');
    // Add order condition if needed
    if (columnt) {
      const condition = columnt.includes('.');
      if (condition) {
        const [relation, column] = columnt.split('.');
        queryBuilder.orderBy(`${relation}.${column}`, sort);
      } else {
        queryBuilder.orderBy(`ventas.${columnt}`, sort);
      }
    }

    // Apply pagination
    queryBuilder.skip(skippedItems).take(10);

    // Return the result
    const [sales, total] = await queryBuilder.getManyAndCount();

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Ventas obtenidas.',
      data: sales,
      count: total,
    };
  }

  async getSaleById(id: number) {
    const sale = await this.salesRepository.findOne({
      where: { id },
      relations: ['cliente', 'tipo_documento', 'medio_pago'],
    });

    // if sale not found
    if (!sale) {
      throw new NotFoundException('Venta no encontrada.');
    }

    const details = await this.salesDetailsRepository.find({
      where: { venta: sale },
      relations: ['articulo'],
    });

    const extraCosts = await this.salesExtraCostsDetailsRepository.find({
      where: { venta: sale },
      relations: ['costo_extra'],
    });

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Venta obtenida.',
      data: {
        sale: sale,
        details: details,
        extraCosts: extraCosts,
      },
    };
  }

  // create a sale
  async createSale(t: CreateSaleDto) {
    const sale = new Sales();
    //validate the data
    //validate the client

    const client = await this.entitiesRepository.findOne({
      where: { rut: t.cliente },
    });

    if (!client) {
      throw new NotFoundException('Cliente no encontrado.');
    }

    sale.cliente = client;

    //validate the document type
    const documentType = await this.documentTypeRepository.findOne({
      where: { id: t.tipo_documento },
    });

    if (!documentType) {
      throw new NotFoundException('Tipo de documento no encontrado.');
    }

    sale.tipo_documento = documentType;

    //validate if is there a sale with the same document number and document type
    const saleExist = await this.salesRepository.findOne({
      where: { documento: t.documento, tipo_documento: documentType },
    });
    if (saleExist) {
      throw new NotFoundException('Venta ya existe.');
    }

    //validate the payment method

    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { id: t.medio_pago },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Medio de pago no encontrado.');
    }

    sale.medio_pago = paymentMethod;

    //validate each extra cost
    //validate the extra cost exist
    let extraCostsError = false;
    for (const extraCost of t.extraCosts) {
      const extraCostExist = await this.salesExtraCostsRepository.findOne({
        where: { id: extraCost.id },
      });

      if (!extraCostExist) {
        extraCostsError = true;
      }
    }

    if (extraCostsError) {
      throw new NotFoundException('Costo extra no encontrado.');
    }

    //validate each product in the sale
    //validate the product exist and the stock of the product
    let productsError = false;
    for (const product of t.productos) {
      //validate the product
      //validate the product exist
      //validate the product stock
      const productExist = await this.productsRepository.findOne({
        where: { id: product.articulo },
      });

      if (!productExist) {
        productsError = true;
      }

      if (productExist.stock < product.cantidad) {
        productsError = true;
      }
    }

    if (productsError) {
      throw new NotFoundException('Producto no encontrado o sin stock.');
    }

    //save the sale
    sale.documento = t.documento;
    sale.monto_neto = t.monto_neto;
    sale.monto_imp = t.monto_imp;
    sale.fecha = new Date();
    sale.usuario = 1;
    sale.costo_neto = t.costo_neto;
    sale.costo_imp = t.costo_imp;

    const saleSaved = await this.salesRepository.save(sale);
    //save the extra costs
    for (const extraCost of t.extraCosts) {
      const extraCostEntity = await this.salesExtraCostsRepository.findOne({
        where: { id: extraCost.id },
      });

      const saleExtraCost = new SalesExtraCostDetails();
      saleExtraCost.venta = sale;
      saleExtraCost.costo_extra = extraCostEntity;
      saleExtraCost.monto = extraCost.value;
      await this.salesExtraCostsDetailsRepository.save(saleExtraCost);
    }
    const productMovementType =
      await this.productMovementTypeRepository.findOne({
        where: { tipo_movimiento: 'venta' },
      });

    //save the details of the sale
    for (const product of t.productos) {
      const detail = new SalesDetails();
      detail.venta = saleSaved;
      detail.articulo = await this.productsRepository.findOne({
        where: { id: product.articulo },
      });
      detail.cantidad = product.cantidad;
      detail.precio_neto = product.precio_neto;
      detail.precio_imp = product.precio_imp;
      detail.costo_neto = product.costo_neto;
      detail.costo_imp = product.costo_imp;
      await this.salesDetailsRepository.save(detail);
      //update the stock of the product
      detail.articulo.stock = detail.articulo.stock - product.cantidad;
      await this.productsRepository.save(detail.articulo);
      // save the product movement
      const productMovementDetail = new ProductMovementDetail();
      productMovementDetail.producto = detail.articulo;
      productMovementDetail.cantidad = product.cantidad;
      productMovementDetail.createdAt = new Date();
      productMovementDetail.movimiento = productMovementType;
      productMovementDetail.id_movimiento = saleSaved.id;
      await this.productMovementDetailRepository.save(productMovementDetail);
    }

    return saleSaved;
  }

  async getExtraCosts() {
    const extraCosts = await this.salesExtraCostsRepository.find();

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Costos extra obtenidos.',
      data: extraCosts,
    };
  }
}
