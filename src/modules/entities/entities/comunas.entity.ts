import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Region } from './regions.entity';

@Entity('comunas')
export class Comune {
  @PrimaryColumn({ type: 'int' })
  id: number;
  @Column({ type: 'varchar', length: 64 })
  comuna: string;
  // columna de relacion con la tabla regiones usando la columna region_id
  @ManyToOne(() => Region, (region) => region.id, { nullable: false })
  @JoinColumn({ name: 'region_id' })
  region: Region;
}
