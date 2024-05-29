import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Comune } from './comunas.entity';
enum Tipo {
  'B' = 'B',
  'C' = 'C',
  'P' = 'P',
}
@Entity('entidades')
export class Entities {
  @PrimaryColumn({ type: 'varchar', length: 11 })
  rut: string;
  @Column({ type: 'varchar', length: 120 })
  nombre: string;
  @Column({ type: 'varchar', length: 90 })
  giro: string;
  @Column({ type: 'enum', enum: Tipo, default: Tipo.B })
  tipo: string;
  @Column({ type: 'varchar', length: 120 })
  direccion: string;
  @ManyToOne(() => Comune, (comuna) => comuna.id, { nullable: false })
  @JoinColumn({ name: 'id_comuna' })
  comuna: Comune;
  @Column({ type: 'int' })
  telefono: number;
  @Column({ type: 'varchar', length: 80 })
  mail: string;
}
