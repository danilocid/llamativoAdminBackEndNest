import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Sales } from '../../sales/entities/sales.entity';

@Entity('ventas_ml')
export class VentaMl {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', name: 'id_orden_ml', unique: true })
  id_orden_ml: string;

  @Column({ type: 'varchar', name: 'id_envio_ml', nullable: true })
  id_envio_ml: string;

  @Column({ type: 'varchar' })
  estado: string;

  @Column({ type: 'varchar', name: 'comprador_nombre' })
  comprador_nombre: string;

  @Column({ type: 'varchar', name: 'comprador_email', nullable: true })
  comprador_email: string;

  @Column({ type: 'json' })
  productos: any;

  @Column({ type: 'int', name: 'monto_total' })
  monto_total: number;

  @Column({ type: 'varchar', length: 10, default: 'CLP' })
  moneda: string;

  @Column({ type: 'int', name: 'costo_envio', nullable: true })
  costo_envio: number;

  @Column({ type: 'int', name: 'comision_ml', nullable: true })
  comision_ml: number;

  @Column({ type: 'datetime', name: 'fecha_venta_ml' })
  fecha_venta_ml: Date;

  @Column({
    type: 'datetime',
    name: 'fecha_sync',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fecha_sync: Date;

  @Column({ type: 'int', name: 'venta_id', nullable: true })
  venta_id: number;

  @Column({ type: 'varchar', length: 191, nullable: true })
  observaciones: string;

  @OneToOne(() => Sales, (sale) => sale.venta_ml)
  @JoinColumn({ name: 'venta_id' })
  venta: Sales;
}
