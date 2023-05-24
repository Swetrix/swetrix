import { Injectable } from '@nestjs/common'
import { CreateExportDto } from './dto/create-export.dto'

@Injectable()
export class ProjectsExportsService {
  async createProjectExport(
    projectId: string,
    createExportDto: CreateExportDto,
  ): Promise<unknown> {
    return {}
  }
}
