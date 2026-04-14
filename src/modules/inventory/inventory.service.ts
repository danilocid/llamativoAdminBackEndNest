import { Injectable } from '@nestjs/common';
import { ProductMovementDetail } from '../products-movements/entities/product_movement_detail.entity';
import { ProductMovementType } from '../products-movements/entities/product_movement_type.entity';
import { Products } from '../products/entities/products.entity';
import { User } from '../auth/entities/user.entity';
import { GetInventoryDto } from './dto/get.dto';
import { SaveInventoryDto } from './dto/save-inventory.dto';
import { SubmitCountDto } from './dto/submit-count.dto';
import { InventoryDetails } from './entities/inventory-details.entity';
import { Inventory } from './entities/inventory.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    @InjectRepository(InventoryDetails)
    private readonly inventoryDetailsRepository: Repository<InventoryDetails>,
    @InjectRepository(Products)
    private readonly productsRepository: Repository<Products>,
    @InjectRepository(ProductMovementDetail)
    private readonly productMovementDetailRepository: Repository<ProductMovementDetail>,
    @InjectRepository(ProductMovementType)
    private readonly productMovementTypeRepository: Repository<ProductMovementType>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getAllInventory(t: GetInventoryDto) {
    const skippedItems = (t.page - 1) * 10;

    // Create a query builder
    const queryBuilder =
      this.inventoryRepository.createQueryBuilder('inventory');
    // Add order condition
    queryBuilder.orderBy(`inventory.id`, 'DESC');

    // add user and movement relations
    queryBuilder.leftJoinAndSelect('inventory.usuario', 'User');
    queryBuilder.leftJoinAndSelect(
      'inventory.tipo_movimiento',
      'ProductMovementType',
    );

    const [data, count] = await queryBuilder
      .skip(skippedItems)
      .take(10)
      .getManyAndCount();
    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Inventory fetched successfully',
      data: data,
      count: count,
    };
  }

  // get inventory by id
  async getInventoryById(t: any) {
    const queryBuilder =
      this.inventoryRepository.createQueryBuilder('inventory');
    queryBuilder.where('inventory.id = :id', { id: t.id });
    queryBuilder.leftJoinAndSelect('inventory.usuario', 'User');
    queryBuilder.leftJoinAndSelect(
      'inventory.tipo_movimiento',
      'ProductMovementType',
    );
    const data = await queryBuilder.getOne();
    if (!data) {
      return {
        serverResponseCode: 404,
        serverResponseMessage: 'Inventory not found',
        data: null,
      };
    }
    const queryBuilderDetails =
      this.inventoryDetailsRepository.createQueryBuilder('inventoryDetails');
    queryBuilderDetails.where('ajuste_de_inventario_id = :id', { id: t.id });
    queryBuilderDetails.leftJoinAndSelect(
      'inventoryDetails.producto',
      'Product',
    );
    const inventoryDetails = await queryBuilderDetails.getMany();

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Inventory fetched successfully',
      data: data,
      inventoryDetails: inventoryDetails,
    };
  }

  // save inventory
  async saveInventory(t: SaveInventoryDto) {
    const inventory = new Inventory();
    inventory.costo_neto = t.costo_neto;
    inventory.costo_imp = t.costo_imp;
    inventory.entradas = t.entradas;
    inventory.salidas = t.salidas;
    inventory.observaciones = t.obs;
    const productMovementType =
      await this.productMovementTypeRepository.findOne({
        where: { id: t.tipo_movimiento },
      });
    inventory.tipo_movimiento = productMovementType;
    //save inventory
    await this.inventoryRepository.save(inventory);
    //save inventory details
    for (const detail of t.articulos) {
      const product = await this.productsRepository.findOne({
        where: { id: detail.id },
      });
      const inventoryDetail = new InventoryDetails();
      inventoryDetail.inventory = inventory;
      inventoryDetail.producto = product;
      inventoryDetail.costo_neto = detail.costo_neto;
      inventoryDetail.costo_imp = detail.costo_imp;
      inventoryDetail.entradas = detail.entradas;
      inventoryDetail.salidas = detail.salidas;
      await this.inventoryDetailsRepository.save(inventoryDetail);

      //update product stock
      product.stock += detail.entradas - detail.salidas;
      //if stock is negative, set it to 0
      if (product.stock < 0) {
        product.stock = 0;
      }

      //if product is inactive, set it to active
      if (!product.activo) {
        product.activo = true;
      }
      await this.productsRepository.save(product);

      //create product movement detail
      const productMovementDetail = new ProductMovementDetail();
      productMovementDetail.producto = product;
      productMovementDetail.cantidad = detail.entradas - detail.salidas;
      productMovementDetail.id_movimiento = inventory.id;
      productMovementDetail.movimiento = productMovementType;
      await this.productMovementDetailRepository.save(productMovementDetail);
    }

    return {
      serverResponseCode: 201,
      serverResponseMessage: 'Inventory created',
      data: inventory,
    };
  }

  // ─── Conteo aleatorio ────────────────────────────────────────────────────────

  async getNextProductToCount() {
    const product = await this.productsRepository
      .createQueryBuilder('product')
      .where('product.stock > 0')
      .orderBy('product.last_cont', 'ASC')
      .getOne();

    if (!product) {
      return {
        serverResponseCode: 404,
        serverResponseMessage:
          'No hay productos con stock disponible para contar',
        data: null,
      };
    }

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Producto obtenido exitosamente',
      data: product,
    };
  }

  async submitRandomCount(dto: SubmitCountDto, userId: number) {
    const product = await this.productsRepository.findOne({
      where: { id: dto.product_id },
    });

    if (!product) {
      return {
        serverResponseCode: 404,
        serverResponseMessage: 'Producto no encontrado',
        data: null,
      };
    }

    const now = new Date();
    let adjustmentCreated = false;
    let adjustment: Inventory | null = null;

    if (dto.stock_counted !== product.stock) {
      const diff = dto.stock_counted - product.stock;
      const entradas = diff > 0 ? diff : 0;
      const salidas = diff < 0 ? Math.abs(diff) : 0;

      const movementType = await this.productMovementTypeRepository
        .createQueryBuilder('t')
        .where('LOWER(t.tipo_movimiento) LIKE :pattern', {
          pattern: '%ajuste%',
        })
        .getOne();

      if (!movementType) {
        return {
          serverResponseCode: 404,
          serverResponseMessage:
            'No se encontró tipo de movimiento de ajuste en la base de datos',
          data: null,
        };
      }

      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      // Crear ajuste de inventario
      const inventory = new Inventory();
      inventory.costo_neto = product.costo_neto;
      inventory.costo_imp = product.costo_imp;
      inventory.entradas = entradas;
      inventory.salidas = salidas;
      inventory.observaciones = `Conteo aleatorio - ${product.descripcion}`;
      inventory.tipo_movimiento = movementType;
      inventory.usuario = user;
      await this.inventoryRepository.save(inventory);

      // Detalle del ajuste
      const detail = new InventoryDetails();
      detail.inventory = inventory;
      detail.producto = product;
      detail.costo_neto = product.costo_neto;
      detail.costo_imp = product.costo_imp;
      detail.entradas = entradas;
      detail.salidas = salidas;
      await this.inventoryDetailsRepository.save(detail);

      // Detalle de movimiento
      const movementDetail = new ProductMovementDetail();
      movementDetail.producto = product;
      movementDetail.cantidad = diff;
      movementDetail.id_movimiento = inventory.id;
      movementDetail.movimiento = movementType;
      movementDetail.user_id = userId;
      await this.productMovementDetailRepository.save(movementDetail);

      // Actualizar stock
      product.stock = dto.stock_counted < 0 ? 0 : dto.stock_counted;

      adjustmentCreated = true;
      adjustment = inventory;
    }

    product.last_cont = now;
    await this.productsRepository.save(product);

    return {
      serverResponseCode: 200,
      serverResponseMessage: adjustmentCreated
        ? 'Conteo registrado y ajuste de inventario creado'
        : 'Conteo registrado sin diferencias',
      adjustmentCreated,
      data: adjustment,
    };
  }

  async getInventoryReportByMonth(month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const adjustments = await this.inventoryRepository.find({
      where: { createdAt: Between(startDate, endDate) },
      order: { createdAt: 'ASC' },
      relations: ['tipo_movimiento', 'usuario'],
    });

    let totalCostoNeto = 0;
    let totalCostoImp = 0;
    let totalEntradas = 0;
    let totalSalidas = 0;

    adjustments.forEach((adj) => {
      totalCostoNeto += adj.costo_neto;
      totalCostoImp += adj.costo_imp;
      totalEntradas += adj.entradas;
      totalSalidas += adj.salidas;
    });

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Ajustes de inventario obtenidos exitosamente',
      data: {
        totals: {
          count: adjustments.length,
          entradas: totalEntradas,
          salidas: totalSalidas,
          costoNeto: totalCostoNeto,
          costoImp: totalCostoImp,
          costoTotal: totalCostoNeto + totalCostoImp,
        },
      },
    };
  }
}
