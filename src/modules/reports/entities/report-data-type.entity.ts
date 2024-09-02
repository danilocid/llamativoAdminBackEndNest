import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
@Entity('tipo_dato_resumen')
export class ReportDataType {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ type: 'varchar', length: 150 })
  dato: string;
  @Column({ type: 'int' })
  orden: number;
  @Column({ type: 'tinyint', default: 1 })
  activo: boolean;
  @Column({ type: 'tinyint', default: 0 })
  isNumber: boolean;
  @Column({ type: 'tinyint', default: 0 })
  isMoney: boolean;
  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'createdAt',
  })
  createdAt: Date;
  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'updatedAt',
  })
  updatedAt: Date;
}
