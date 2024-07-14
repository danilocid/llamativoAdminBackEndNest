import { ProductMovementType } from './entities/product_movement_type.entity';
import { Repository, Equal } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ProductMovementDetail } from './entities/product_movement_detail.entity';
import { Products } from '../products/entities/products.entity';
import { NotFoundException } from '@nestjs/common';

export class ProductsMovementsService {
  constructor(
    @InjectRepository(ProductMovementType)
    private productMovementTypeRepository: Repository<ProductMovementType>,
    @InjectRepository(ProductMovementDetail)
    private productMovementRepository: Repository<ProductMovementDetail>,
    @InjectRepository(Products)
    private productsRepository: Repository<Products>,
  ) {}
  async getAllProductsMovements(productId: number) {
    // Get all movements of a product

    // verify if the product exists
    const productFind: Products = await this.productsRepository.findOne({
      where: { id: productId },
    });

    if (!productFind) {
      throw new NotFoundException('Producto no encontrado');
    }
    const movements = await this.productMovementRepository.find({
      where: { producto: { id: Equal(productId) } },
      relations: ['movimiento'],
    });

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Movimientos de productos',
      data: {
        product: productFind,
        movements,
      },
    };
  }

  async getAllProductsMovementsTypes() {
    const types = await this.productMovementTypeRepository.find();

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Tipos de movimientos de productos',
      data: types,
    };
  }
}
