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
  @Column({ type: 'varchar', length: 255 })
  url: string;
  @Column({ default: false })
  readed: boolean;
  @Column({ default: () => 'null', nullable: true })
  readedAt: Date;
  @CreateDateColumn({ name: 'createdAt', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updatedAt', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
