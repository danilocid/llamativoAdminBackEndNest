import { Entities } from 'src/modules/entities/entities/entities.entity';
import { DocumentType } from '../../common/entities/document_type.entity';

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PurchasesTypes } from './purchases-types.entity';

@Entity('compras')
export class Purchases {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Entities, (entity) => entity.rut)
  @JoinColumn({ name: 'proveedor' })
  proveedor: Entities;

  @ManyToOne(() => DocumentType, (documentType) => documentType.id)
  @JoinColumn({ name: 'tipo_documento' })
  tipo_documento: DocumentType;

  @Column({ type: 'int' })
  documento: number;

  @Column({ type: 'date' })
  fecha_documento: Date;

  @Column({ type: 'int' })
  monto_neto_documento: number;

  @Column({ type: 'int' })
  monto_imp_documento: number;

  @Column({ type: 'int' })
  costo_neto_documento: number;

  @Column({ type: 'int' })
  costo_imp_documento: number;

  @ManyToOne(() => PurchasesTypes, (purchaseType) => purchaseType.id)
  @JoinColumn({ name: 'tipo_compra' })
  tipo_compra: PurchasesTypes;

  @Column({ type: 'varchar', length: 255 })
  observaciones: string;
}
