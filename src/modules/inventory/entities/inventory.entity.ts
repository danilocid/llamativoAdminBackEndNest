import { User } from 'src/modules/auth/entities/user.entity';
import { ProductMovementType } from 'src/modules/products-movements/entities/product_movement_type.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

@Entity('ajustes_de_inventarios')
export class Inventory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  costo_neto: number;

  @Column({ type: 'int' })
  costo_imp: number;

  @Column({ type: 'int' })
  entradas: number;

  @Column({ type: 'int' })
  salidas: number;

  @ManyToOne(
    () => ProductMovementType,
    (productMovementType) => productMovementType.id,
  )
  @JoinColumn({ name: 'tipo_movimiento_id' })
  tipo_movimiento: ProductMovementType;

  @Column({ type: 'varchar', length: 191 })
  observaciones: string;

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'user_id' })
  usuario: User;

  @CreateDateColumn({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
