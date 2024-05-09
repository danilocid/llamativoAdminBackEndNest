import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('tipo_documento')
export class DocumentType {
  @PrimaryColumn({ type: 'int' })
  id: number;
  @Column({ type: 'varchar', length: 60 })
  tipo: string;
}
