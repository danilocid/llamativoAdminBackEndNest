import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Param,
  Put,
} from '@nestjs/common';
import { IssuesService } from './issues.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import {
  CreateIssueDto,
  CreateIssueSectionDto,
  CreateIssueTypeDto,
  GetIssuesDto,
  UpdateIssueDto,
} from './dto/issue.dto';

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

  // get all issues statuses
  @Get('statuses')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getIssueStatuses() {
    return await this.issuesService.getIssueStatuses();
  }

  // get all issues
  @Get()
  @ApiBearerAuth('jwt')
  @ApiQuery({
    type: GetIssuesDto,
    name: 'type',
    required: false,
    description: 'Get all issues or only pending issues',
  })
  @UseGuards(JwtAuthGuard)
  async getIssues(@Query() query: GetIssuesDto) {
    return await this.issuesService.getIssues(query);
  }
  // get issues report
  @Get('report')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getIssuesReport() {
    return await this.issuesService.getIssuesReport();
  }

  //get issue by id
  @Get(':id')
  @ApiBearerAuth('jwt')
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Issue id',
    example: 1,
  })
  @UseGuards(JwtAuthGuard)
  async getIssueById(@Param() id: number) {
    return await this.issuesService.getIssueById(id);
  }

  // create a issue
  @Post()
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ApiBody({
    description: 'Create issue',
    type: CreateIssueDto,
  })
  async createIssue(@Body() issue: CreateIssueDto) {
    return await this.issuesService.createIssue(issue);
  }

  // update issue
  @Put()
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ApiBody({
    description: 'Update issue',
    type: UpdateIssueDto,
  })
  async updateIssue(@Body() issue: UpdateIssueDto) {
    return await this.issuesService.updateIssue(issue);
  }
}
