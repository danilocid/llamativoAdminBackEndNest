import { Injectable } from '@nestjs/common';
import { IssueSection } from './entities/issue_section.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IssueType } from './entities/issuse_type.entity';
import { CreateIssueTypeDto } from './dto/issue.dto';

@Injectable()
export class IssuesService {
  constructor(
    @InjectRepository(IssueSection)
    private issueSectionRepository: Repository<IssueSection>,
    @InjectRepository(IssueType)
    private issueTypeRepository: Repository<IssueType>,
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
}
