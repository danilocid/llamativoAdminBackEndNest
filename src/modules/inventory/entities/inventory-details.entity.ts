import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Inventory } from './inventory.entity';
import { Products } from 'src/modules/products/entities/products.entity';
@Entity('detalle_ajustes_de_inventarios')
export class InventoryDetails {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Inventory, (inventory) => inventory.id)
  @JoinColumn({ name: 'ajuste_de_inventario_id' })
  inventory: Inventory;
  @ManyToOne(() => Products, (product) => product.id)
  @JoinColumn({ name: 'articulo_id' })
  producto: Products;
  @Column({ type: 'int' })
  costo_neto: number;
  @Column({ type: 'int' })
  costo_imp: number;
  @Column({ type: 'int' })
  entradas: number;
  @Column({ type: 'int' })
  salidas: number;
  @CreateDateColumn({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
