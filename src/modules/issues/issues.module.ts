import { Module } from '@nestjs/common';
import { IssuesService } from './issues.service';
import { IssuesController } from './issues.controller';
import { IssueSection } from './entities/issue_section.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IssueType } from './entities/issuse_type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([IssueSection, IssueType])],
  controllers: [IssuesController],
  providers: [IssuesService],
})
export class IssuesModule {}
