import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProductMovementType } from './product_movement_type.entity';
import { Products } from '../../products/entities/products.entity';

@Entity('detalle_movimientos_articulos')
export class ProductMovementDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => ProductMovementType,
    (productMovementType) => productMovementType.id,
  )
  @JoinColumn({ name: 'movimiento_id' })
  movimiento: ProductMovementType;

  @Column({ type: 'int' })
  id_movimiento: number;

  @ManyToOne(() => Products, (product) => product.id)
  @JoinColumn({ name: 'producto_id' })
  producto: Products;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({ type: 'int', name: 'usuario_id', default: 1 })
  user_id: number;

  @CreateDateColumn({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
