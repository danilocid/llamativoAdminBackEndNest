import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { DocumentType } from '../../common/entities/document_type.entity';
import { Entities } from 'src/modules/entities/entities/entities.entity';
import { PaymentMethod } from 'src/modules/common/entities/payment_method.entity';

@Entity('ventas')
export class Sales {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  monto_neto: number;

  @Column({ type: 'int' })
  monto_imp: number;

  @Column({ type: 'int' })
  costo_neto: number;

  @Column({ type: 'int' })
  costo_imp: number;

  @ManyToOne(() => DocumentType, (documentType) => documentType.id)
  @JoinColumn({ name: 'tipo_documento' })
  tipo_documento: DocumentType;

  @Column({ type: 'int' })
  documento: number;

  @ManyToOne(() => Entities, (entity) => entity.rut)
  @JoinColumn({ name: 'cliente' })
  cliente: Entities;

  @ManyToOne(() => PaymentMethod, (paymentMethod) => paymentMethod.id)
  @JoinColumn({ name: 'medio_pago' })
  medio_pago: PaymentMethod;

  @Column({
    type: 'datetime',
    name: 'fecha',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fecha: Date;

  @Column({ type: 'int', name: 'usuario', default: 1 })
  usuario: number;
}
