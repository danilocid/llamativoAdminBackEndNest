import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('regiones')
export class Region {
  @PrimaryColumn({ type: 'int' })
  id: number;
  @Column({ type: 'varchar', length: 64 })
  region: string;
}
