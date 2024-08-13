import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
@Entity('tipo_compra')
export class PurchasesTypes {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 60, unique: true })
  tipo_compra: string;
}
