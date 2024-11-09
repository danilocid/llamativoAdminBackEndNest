import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Reception } from './reception.entity';
import { Products } from 'src/modules/products/entities/products.entity';
@Entity('detalle_recepciones')
export class ReceptionDetails {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Reception, (reception) => reception.id)
  @JoinColumn({ name: 'id_recepcion' })
  recepcion: Reception;

  @ManyToOne(() => Products, (product) => product.id)
  @JoinColumn({ name: 'id_producto' })
  producto: Products;

  @Column({ type: 'int' })
  costo_neto: number;

  @Column({ type: 'int' })
  costo_imp: number;

  @Column({ type: 'int' })
  unidades: number;
}
