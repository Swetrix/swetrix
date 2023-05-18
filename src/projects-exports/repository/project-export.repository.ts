import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProjectExport } from '../entity/project-export.entity'

@Injectable()
export class ProjectExportRepository {
  constructor(
    @InjectRepository(ProjectExport)
    private readonly projectExportRepository: Repository<ProjectExport>,
  ) {}

  async findProjectById(projectId: string): Promise<ProjectExport> {
    return this.projectExportRepository.findOne(projectId)
  }

  async findAndCountProjectExports(
    projectId: string,
    offset: number,
    limit: number,
  ): Promise<{ exports: ProjectExport[]; count: number }> {
    const [exports, count] = await this.projectExportRepository.findAndCount({
      skip: offset,
      take: limit > 100 ? 100 : limit,
      where: { projectId },
    })
    return { exports, count }
  }

  async findProjectExportById(
    projectId: string,
    exportId: string,
  ): Promise<ProjectExport> {
    return this.projectExportRepository.findOne({
      where: { id: exportId, projectId },
    })
  }
}
