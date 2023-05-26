import { Injectable } from '@nestjs/common'
import { CreateExportDto } from './dto/create-export.dto'
import { ProjectExport } from './entity/project-export.entity'
import { ProjectExportRepository } from './repository/project-export.repository'

@Injectable()
export class ProjectsExportsService {
  constructor(
    private readonly projectExportRepository: ProjectExportRepository,
  ) {}

  async createProjectExport(
    projectId: string,
    { startDate, endDate }: CreateExportDto,
  ): Promise<ProjectExport> {
    const projectExport =
      await this.projectExportRepository.createProjectExport(projectId, {
        startDate,
        endDate,
      })

    return projectExport
  }
}
