import { Injectable } from '@nestjs/common'
import AdmZip from 'adm-zip'
import { writeFile } from 'fs/promises'
import { parseAsync } from 'json2csv'
import { tmpdir } from 'os'
import { join } from 'path'
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

  async convertJSONtoCSV(
    jsonData: object[],
    exportId: string,
    fileName: 'analytics' | 'captcha' | 'custom-events' | 'performance',
  ): Promise<void> {
    const csvData = await parseAsync(jsonData)
    await writeFile(join(tmpdir(), exportId, `${fileName}.csv`), csvData)
  }

  async createZipArchive(exportId: string): Promise<void> {
    const zip = new AdmZip()
    zip.addLocalFolder(join(tmpdir(), exportId))
    zip.writeZip(join(tmpdir(), `${exportId}.zip`))
  }
}
