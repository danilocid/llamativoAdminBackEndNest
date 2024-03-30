import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IssuesService } from './issues.service';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CreateIssueSectionDto, CreateIssueTypeDto } from './dto/issue.dto';

@Controller('issues')
@ApiTags('Issues')
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}
  // get all issue sections
  @Get('sections')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getIssueSections() {
    return await this.issuesService.getIssueSections();
  }

  // create a issue section
  @Post('sections')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ApiBody({
    description: 'Create issue section',
    type: CreateIssueSectionDto,
    examples: {
      issueSection: {
        description: 'Create issue section',
        value: {
          name: 'Issue section name',
        },
      },
    },
  })
  async createIssueSection(@Body() issueSection: CreateIssueSectionDto) {
    return await this.issuesService.createIssueSection(issueSection);
  }

  // get all issues types
  @Get('types')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getIssueTypes() {
    return await this.issuesService.getIssueTypes();
  }

  // create a issue type
  @Post('types')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ApiBody({
    description: 'Create issue type',
    type: CreateIssueTypeDto,
    examples: {
      issueType: {
        description: 'Create issue type',
        value: {
          issue_type: 'Issue type name',
        },
      },
    },
  })
  async createIssueType(@Body() issueType: CreateIssueTypeDto) {
    return await this.issuesService.createIssueType(issueType);
  }
}
