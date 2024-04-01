import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { IssueType } from './issuse_type.entity';
import { IssueStatus } from './issue_status.entity';
import { IssueSection } from './issue_section.entity';

@Entity('issues')
export class Issue {
  // add id, title, description, createdAt, updatedAt fields
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ type: 'varchar', length: 255 })
  issue: string;

  @CreateDateColumn({ name: 'createdAt', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updatedAt', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
  @ManyToOne(() => IssueType, (issueType) => issueType.id)
  @JoinColumn({ name: 'id_type' })
  issueType: IssueType;
  @ManyToOne(() => IssueStatus, (issueStatus) => issueStatus.id)
  @JoinColumn({ name: 'id_status' })
  issueStatus: IssueStatus;
  @ManyToOne(() => IssueSection, (issueSection) => issueSection.id)
  @JoinColumn({ name: 'id_section' })
  issueSection: IssueSection;
}
