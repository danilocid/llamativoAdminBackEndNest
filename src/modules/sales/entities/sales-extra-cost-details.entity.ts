import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Sales } from './sales.entity';
import { SalesExtraCosts } from './sales-extra-costs.entity';

@Entity()
export class SalesExtraCostDetails {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Sales, (sale) => sale.id)
  @JoinColumn()
  venta: Sales;

  @ManyToOne(() => SalesExtraCosts, (cost) => cost.id)
  @JoinColumn()
  costo_extra: SalesExtraCosts;

  @Column({ type: 'int' })
  monto: number;
}
