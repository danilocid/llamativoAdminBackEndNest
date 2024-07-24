import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Sales } from './sales.entity';
import { Products } from 'src/modules/products/entities/products.entity';

@Entity('detalle_ventas')
export class SalesDetails {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Sales, (sale) => sale.id)
  @JoinColumn({ name: 'id_venta' })
  venta: Sales;

  @ManyToOne(() => Products, (product) => product.id)
  @JoinColumn({ name: 'articulo' })
  articulo: Products;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({ type: 'int' })
  precio_neto: number;

  @Column({ type: 'int' })
  precio_imp: number;

  @Column({ type: 'int' })
  costo_neto: number;

  @Column({ type: 'int' })
  costo_imp: number;
}
