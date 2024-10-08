import { ProductMovementDetail } from '../products-movements/entities/product_movement_detail.entity';
import { ProductMovementType } from '../products-movements/entities/product_movement_type.entity';
import { Products } from '../products/entities/products.entity';
import { GetInventoryDto } from './dto/get.dto';
import { SaveInventoryDto } from './dto/save-inventory.dto';
import { InventoryDetails } from './entities/inventory-details.entity';
import { Inventory } from './entities/inventory.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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
    //console.log(data);
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
}
