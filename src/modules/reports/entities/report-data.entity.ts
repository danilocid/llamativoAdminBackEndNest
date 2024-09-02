import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ReportDataType } from './report-data-type.entity';
@Entity('datos_resumen')
export class ReportData {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ type: 'int' })
  mes: number;
  @Column({ type: 'int' })
  año: number;
  @ManyToOne(() => ReportDataType, (reportDataType) => reportDataType.id, {
    nullable: false,
  })
  @JoinColumn({ name: 'idDato' })
  reportDataType: ReportDataType;
  @Column({ type: 'varchar', length: 125 })
  dato: string;
  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'createdAt',
  })
  createdAt: Date;
}
