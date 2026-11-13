import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ type: 'varchar', length: 255 })
  title: string;
  @Column({ type: 'varchar', length: 255 })
  description: string;
  @Column({ default: false })
  readed: boolean;
  @Column({ type: 'varchar', length: 255, nullable: true, default: 'null' })
  url: string;
  /**
   * Color de criticidad: success (verde, no crítica), warning (amarillo,
   * más crítica), danger (rojo, crítica) o info (celeste, ventas ML).
   * Se clasifica automáticamente al insertar (NotificationsColorSubscriber).
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  color: string;
  @Column({ default: () => 'null', nullable: true })
  readedAt: Date;
  @CreateDateColumn({ name: 'createdAt', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updatedAt', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
