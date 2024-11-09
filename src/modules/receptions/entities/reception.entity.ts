import { DocumentType } from 'src/modules/common/entities/document_type.entity';
import { Entities } from 'src/modules/entities/entities/entities.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
@Entity('recepciones')
export class Reception {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Entities, (entity) => entity.rut)
  @JoinColumn({ name: 'proveedor' })
  proveedor: Entities;

  @Column({ type: 'int' })
  costo_neto: number;

  @Column({ type: 'int' })
  costo_imp: number;

  @Column({ type: 'int' })
  unidades: number;

  @ManyToOne(() => DocumentType, (documentType) => documentType.id)
  @JoinColumn({ name: 'tipo_documento' })
  tipo_documento: DocumentType;

  @Column({ type: 'int' })
  documento: number;

  @Column({ type: 'datetime' })
  fecha: Date;
}
