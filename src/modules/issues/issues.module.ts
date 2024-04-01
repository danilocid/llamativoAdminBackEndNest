import { Module } from '@nestjs/common';
import { IssuesService } from './issues.service';
import { IssuesController } from './issues.controller';
import { IssueSection } from './entities/issue_section.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IssueType } from './entities/issuse_type.entity';
import { IssueStatus } from './entities/issue_status.entity';
import { Issue } from './entities/issue.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([IssueSection, IssueType, IssueStatus, Issue]),
  ],
  controllers: [IssuesController],
  providers: [IssuesService],
})
export class IssuesModule {}
