import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
@Unique(['email'])
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;
  @Column({ type: 'varchar', length: 255 })
  user: string;
  @Column({ type: 'varchar', length: 255 })
  email: string;
  @Column({ type: 'varchar', length: 255 })
  password: string;
  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
