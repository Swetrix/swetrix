import { Injectable } from '@nestjs/common'
import AdmZip from 'adm-zip'
import { writeFile } from 'fs/promises'
import { parseAsync } from 'json2csv'
import { tmpdir } from 'os'
import { join } from 'path'
import { clickhouse } from 'src/common/constants'
import { CreateExportDto } from './dto/create-export.dto'
import { ProjectExport } from './entity/project-export.entity'
import { ProjectData } from './interface/project-data.interface'
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

  async getProjectData(
    projectId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ProjectData> {
    const formattedStartDate = `${new Date(startDate)
      .toISOString()
      .slice(0, 10)} 00:00:00`
    const formattedEndDate = `${new Date(endDate)
      .toISOString()
      .slice(0, 10)} 23:59:59`

    const query = `
      SELECT *
      FROM {table}
      WHERE pid = {pid: FixedString(12)}
        AND created >= {startDate: DateTime}
        AND created <= {endDate: DateTime}
    `

    const params = {
      pid: projectId,
      startDate: formattedStartDate,
      endDate: formattedEndDate,
    }

    const queries: { table: string; resultKey: keyof ProjectData }[] = [
      { table: 'analytics', resultKey: 'analytics' },
      { table: 'captcha', resultKey: 'captcha' },
      { table: 'customEV', resultKey: 'customEvents' },
      { table: 'performance', resultKey: 'performance' },
    ]

    const resultPromises = queries.map(async ({ table, resultKey }) => {
      const result = await clickhouse
        .query(query.replace('{table}', table), { params })
        .toPromise()
      return { [resultKey]: result } as Partial<ProjectData>
    })

    const results = await Promise.all(resultPromises)
    return Object.assign({}, ...results) as ProjectData
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
