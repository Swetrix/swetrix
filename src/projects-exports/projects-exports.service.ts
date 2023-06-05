import { HttpService } from '@nestjs/axios'
import { InjectQueue } from '@nestjs/bull'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as AdmZip from 'adm-zip'
import { Queue } from 'bull'
import { mkdir, readFile, rm, writeFile } from 'fs/promises'
import { parseAsync } from 'json2csv'
import { tmpdir } from 'os'
import { join } from 'path'
import { firstValueFrom } from 'rxjs'
import { clickhouse } from 'src/common/constants'
import { CreateExportDto } from './dto/create-export.dto'
import { ProjectExport } from './entity/project-export.entity'
import { FileName } from './enum/file-name.enum'
import { ProjectData } from './interface/project-data.interface'
import { ProjectExportRepository } from './repository/project-export.repository'

@Injectable()
export class ProjectsExportsService {
  private readonly logger = new Logger(ProjectsExportsService.name)

  constructor(
    @InjectQueue('projects-exports')
    private readonly projectsExportsQueue: Queue,
    private readonly projectExportRepository: ProjectExportRepository,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
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

  async createZipArchive(exportId: string): Promise<{
    zipFileData: Buffer
    zipFileName: string
    zipFilePath: string
  }> {
    const zip = new AdmZip()
    const folderPath = join(tmpdir(), exportId)
    zip.addLocalFolder(folderPath)
    const zipPath = join(tmpdir(), `${exportId}.zip`)
    zip.writeZip(zipPath)
    await rm(folderPath, { recursive: true, force: true })
    const zipData = await readFile(zipPath)
    return { zipFileData: zipData, zipFileName: exportId, zipFilePath: zipPath }
  }

  // It's not finished! Swetrix CDN has a problem. Swetrix CDN is giving away an empty archive.
  async uploadZipArchive(
    zipFileData: Buffer,
    zipFileName: string,
    zipFilePath: string,
  ): Promise<string> {
    try {
      const formData = new FormData()
      formData.append(
        'token',
        this.configService.getOrThrow<string>('CDN_ACCESS_TOKEN'),
      )

      // formData.append('file', zipFileData, { filename: `${zipFileName}.zip` })

      const { data } = await firstValueFrom(
        this.httpService.post<{ filename: string }>(
          `${this.configService.getOrThrow<string>('CDN_URL')}/file`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          },
        ),
      )

      await rm(zipFilePath, { force: true })

      return `${this.configService.getOrThrow<string>('CDN_URL')}/file/${
        data.filename
      }`
    } catch (error) {
      this.logger.error(error)
      throw error
    }
  }
}
