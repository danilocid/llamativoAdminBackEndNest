import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Parámetros de configuración generales del sistema.
 * `name` es la clave técnica (ej: telegram_chat_id) y `parameter` su valor.
 */
@Entity('settings')
export class Setting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 191, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true, default: null })
  parameter: string;

  @CreateDateColumn({ name: 'createdAt', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
