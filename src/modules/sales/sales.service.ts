import { Sales } from './entities/sales.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { GetSalesDto } from './dto/get.dto';
import { NotFoundException } from '@nestjs/common';
import { SalesDetails } from './entities/sales-details.entity';
export class SalesService {
  constructor(
    @InjectRepository(Sales)
    private salesRepository: Repository<Sales>,
    @InjectRepository(SalesDetails)
    private salesDetailsRepository: Repository<SalesDetails>,
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

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Venta obtenida.',
      data: {
        sale: sale,
        details: details,
      },
    };
  }
}
