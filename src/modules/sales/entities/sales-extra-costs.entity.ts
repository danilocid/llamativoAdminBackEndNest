import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class SalesExtraCosts {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;
}
