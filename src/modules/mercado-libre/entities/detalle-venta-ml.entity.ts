import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { VentaMl } from './venta-ml.entity';

@Entity('detalles_ventas_ml')
export class DetalleVentaMl {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', name: 'id_orden_ml', unique: true })
  id_orden_ml: string;

  @Column({ type: 'int', name: 'venta_ml_id' })
  venta_ml_id: number;

  @Column({ type: 'json' })
  productos: any;

  @Column({ type: 'int', name: 'monto_orden' })
  monto_orden: number;

  @Column({ type: 'datetime', name: 'fecha_orden_ml' })
  fecha_orden_ml: Date;

  @ManyToOne(() => VentaMl, (venta) => venta.detalles)
  @JoinColumn({ name: 'venta_ml_id' })
  venta_ml: VentaMl;
}
