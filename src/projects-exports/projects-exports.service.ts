import { InjectQueue } from '@nestjs/bull'
import { Injectable } from '@nestjs/common'
import * as AdmZip from 'adm-zip'
import { Queue } from 'bull'
import { mkdir, rm, writeFile } from 'fs/promises'
import { parseAsync } from 'json2csv'
import { tmpdir } from 'os'
import { join } from 'path'
import { clickhouse } from 'src/common/constants'
import { CreateExportDto } from './dto/create-export.dto'
import { ProjectExport } from './entity/project-export.entity'
import { FileName } from './enum/file-name.enum'
import { ProjectData } from './interface/project-data.interface'
import { ProjectExportRepository } from './repository/project-export.repository'

@Injectable()
export class ProjectsExportsService {
  constructor(
    @InjectQueue('projects-exports')
    private readonly projectsExportsQueue: Queue,
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

    const { id } = projectExport

    const exportDir = join(tmpdir(), id)
    await mkdir(exportDir)

    await this.projectsExportsQueue.add('export', projectExport)

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
    fileName: FileName,
  ): Promise<void> {
    if (jsonData.length === 0) {
      return
    }

    const csvData = await parseAsync(jsonData)
    const filePath = join(tmpdir(), exportId, `${fileName}.csv`)
    await writeFile(filePath, csvData)
  }

  async createZipArchive(exportId: string): Promise<{ path: string }> {
    const zip = new AdmZip()
    const folderPath = join(tmpdir(), exportId)
    zip.addLocalFolder(folderPath)
    const zipPath = join(tmpdir(), `${exportId}.zip`)
    zip.writeZip(zipPath)
    await rm(folderPath, { recursive: true, force: true })
    return { path: zipPath }
  }
}
