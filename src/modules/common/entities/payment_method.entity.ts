import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('medios_de_pago')
export class PaymentMethod {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ type: 'varchar', length: 120 })
  medio_de_pago: string;
}
