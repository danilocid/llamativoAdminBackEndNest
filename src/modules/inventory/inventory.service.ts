import { GetInventoryDto } from './dto/get.dto';
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
}
