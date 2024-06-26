import { Injectable } from '@nestjs/common';
import { IssueSection } from './entities/issue_section.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, Like } from 'typeorm';
import { IssueType } from './entities/issuse_type.entity';
import { CreateIssueTypeDto, GetIssuesDto } from './dto/issue.dto';
import { IssueStatus } from './entities/issue_status.entity';
import { Issue } from './entities/issue.entity';

@Injectable()
export class IssuesService {
  constructor(
    @InjectRepository(IssueSection)
    private issueSectionRepository: Repository<IssueSection>,
    @InjectRepository(IssueType)
    private issueTypeRepository: Repository<IssueType>,
    @InjectRepository(IssueStatus)
    private issueStatusRepository: Repository<IssueStatus>,
    @InjectRepository(Issue)
    private issueRepository: Repository<Issue>,
  ) {}
  async getIssueSections() {
    const issueSections = await this.issueSectionRepository.find();

    // Remove createdAt and updatedAt fields
    const issueSectionsFiltered = [];
    issueSections.forEach((issueSection) => {
      issueSectionsFiltered.push({
        id: issueSection.id,
        name: issueSection.name,
      });
    });
    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Secciones de incidencias obtenidas.',
      data: issueSectionsFiltered,
    };
  }

  async createIssueSection(issueSection) {
    issueSection = await this.issueSectionRepository.save(issueSection);

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Sección de incidencia creada.',
      data: issueSection,
    };
  }

  async getIssueTypes() {
    const issueTypes = await this.issueTypeRepository.find();

    // Remove createdAt and updatedAt fields
    const issueTypesFiltered = [];
    issueTypes.forEach((issueType) => {
      issueTypesFiltered.push({
        id: issueType.id,
        name: issueType.issue_type,
      });
    });
    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Tipos de incidencias obtenidos.',
      data: issueTypesFiltered,
    };
  }

  async createIssueType(issueType: CreateIssueTypeDto) {
    issueType = await this.issueTypeRepository.save(issueType);

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Tipo de incidencia creado.',
      data: issueType,
    };
  }

  async getIssueStatuses() {
    const issueStatuses = await this.issueStatusRepository.find();

    // Remove createdAt and updatedAt fields
    const issueStatusesFiltered = [];
    issueStatuses.forEach((issueStatus) => {
      issueStatusesFiltered.push({
        id: issueStatus.id,
        name: issueStatus.name,
      });
    });
    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Estados de incidencias obtenidos.',
      data: issueStatusesFiltered,
    };
  }

  // get all issues
  async getIssues(query: GetIssuesDto) {
    const skippedItems = (query.page - 1) * 10;
    let count = 0;
    let issues = [];
    let where = [];
    let order = {};
    const columnt: string = query.order;
    const sort = query.sort;
    if (query.param != '' && query.param != undefined) {
      query.type = 'all';
      where = [
        { issue: Like(`%${query.param}%`) },
        {
          issueType: {
            issue_type: Like(`%${query.param}%`),
          },
        },
        {
          issueSection: {
            name: Like(`%${query.param}%`),
          },
        },
        {
          issueStatus: {
            name: Like(`%${query.param}%`),
          },
        },
      ];
    }
    if (query.order != '' && query.order != undefined) {
      // if query.order have a . then it is a relation, so we need to split it
      const condition = columnt.includes('.');
      if (condition) {
        const [relation, column] = columnt.split('.');
        order = {
          [relation]: {
            [column]: sort,
          },
        };
      } else {
        order = {
          [columnt]: sort,
        };
      }
    }
    if (query.type === 'pending') {
      //get status 1 issues
      const status = await this.issueStatusRepository.findOne({
        where: { id: 3 },
      });

      [issues, count] = await this.issueRepository.findAndCount({
        where: {
          issueStatus: Not(status.id),
        },
        take: 10,
        skip: skippedItems,
        relations: ['issueType', 'issueStatus', 'issueSection'],
        order: order,
      });

      return {
        serverResponseCode: 200,
        serverResponseMessage: 'Incidencias pendientes obtenidas.',
        data: issues,
        count,
      };
    } else {
      [issues, count] = await this.issueRepository.findAndCount({
        where: where,
        take: 10,
        skip: skippedItems,
        relations: ['issueType', 'issueStatus', 'issueSection'],
        order: order,
      });

      return {
        serverResponseCode: 200,
        serverResponseMessage: 'Incidencias obtenidas.',
        data: issues,
        count,
      };
    }
  }

  //get issue by id
  async getIssueById(id: any) {
    id = Number(id.id);

    const issue = await this.issueRepository.findOne({
      where: { id: id },
      relations: ['issueType', 'issueStatus', 'issueSection'],
    });

    if (!issue) {
      return {
        serverResponseCode: 404,
        serverResponseMessage: 'Incidencia no encontrada.',
        data: null,
      };
    }

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Incidencia obtenida.',
      data: issue,
    };
  }

  // create a issue

  async createIssue(issue) {
    //check if issue type exists
    const issueType = await this.issueTypeRepository.findOne({
      where: { id: issue.type_id },
    });

    if (!issueType) {
      return {
        serverResponseCode: 404,
        serverResponseMessage: 'Tipo de incidencia no encontrado.',
        data: null,
      };
    }

    issue.issueType = issueType;

    //check if issue section exists
    const issueSection = await this.issueSectionRepository.findOne({
      where: { id: issue.section_id },
    });

    if (!issueSection) {
      return {
        serverResponseCode: 404,
        serverResponseMessage: 'Sección de incidencia no encontrada.',
        data: null,
      };
    }

    issue.issueSection = issueSection;

    //get status 1
    const status = await this.issueStatusRepository.findOne({
      where: { id: 1 },
    });

    issue.issueStatus = status;

    issue = await this.issueRepository.save(issue);

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Incidencia creada.',
      data: issue,
    };
  }

  // update issue

  async updateIssue(issue) {
    //check if issue exists
    const issueExists = await this.issueRepository.findOne({
      where: { id: issue.id },
    });

    if (!issueExists) {
      return {
        serverResponseCode: 404,
        serverResponseMessage: 'Incidencia no encontrada.',
        data: null,
      };
    }
    issueExists.issue = issue.issue;
    //check if issue type exists
    const issueType = await this.issueTypeRepository.findOne({
      where: { id: issue.type_id },
    });

    if (!issueType) {
      return {
        serverResponseCode: 404,
        serverResponseMessage: 'Tipo de incidencia no encontrado.',
        data: null,
      };
    }
    issueExists.issueType = issueType;
    issue.issueType = issueType;

    //check if issue section exists
    const issueSection = await this.issueSectionRepository.findOne({
      where: { id: issue.section_id },
    });

    if (!issueSection) {
      return {
        serverResponseCode: 404,
        serverResponseMessage: 'Sección de incidencia no encontrada.',
        data: null,
      };
    }
    issueExists.issueSection = issueSection;
    issue.issueSection = issueSection;

    // check if issue status exists
    const issueStatus = await this.issueStatusRepository.findOne({
      where: { id: issue.status_id },
    });

    if (!issueStatus) {
      return {
        serverResponseCode: 404,
        serverResponseMessage: 'Estado de incidencia no encontrado.',
        data: null,
      };
    }
    issueExists.issueStatus = issueStatus;
    issue.issueStatus = issueStatus;

    delete issueExists.updatedAt;

    issue = await this.issueRepository.update(issue.id, issueExists);

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Incidencia actualizada.',
      data: issue,
    };
  }

  //get issues report
  async getIssuesReport() {
    // count issues by status
    const status = await this.issueRepository
      .createQueryBuilder('issue')
      .select('issue.issueStatus', 'status')
      .addSelect('issueStatus.name', 'name')
      .addSelect('COUNT(issue.id)', 'count')
      .leftJoin('issue.issueStatus', 'issueStatus')
      .groupBy('issue.issueStatus')
      .getRawMany();

    //count issues by type
    const type = await this.issueRepository
      .createQueryBuilder('issue')
      .select('issue.issueType', 'type')
      .addSelect('issueType.issue_type', 'name')
      .addSelect('COUNT(issue.id)', 'count')
      .leftJoin('issue.issueType', 'issueType')
      .groupBy('issue.issueType')
      .getRawMany();

    // count issues by section
    const section = await this.issueRepository
      .createQueryBuilder('issue')
      .select('issue.issueSection', 'section')
      .addSelect('issueSection.name', 'name')
      .addSelect('COUNT(issue.id)', 'count')
      .leftJoin('issue.issueSection', 'issueSection')
      .groupBy('issue.issueSection')
      .getRawMany();

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Reporte de incidencias obtenido.',
      data: {
        status,
        type,
        section,
      },
    };
  }
}
