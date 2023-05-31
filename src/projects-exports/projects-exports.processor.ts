import { Processor, Process } from '@nestjs/bull'
import { Job } from 'bull'
import { ProjectExport } from './entity/project-export.entity'
import { FileName } from './enum/file-name.enum'
import { ProjectsExportsService } from './projects-exports.service'

@Processor('projects-exports')
export class ProjectsExportsProcessor {
  constructor(
    private readonly projectsExportsService: ProjectsExportsService,
  ) {}

  @Process('export')
  async export(job: Job<ProjectExport>) {
    const { id, projectId, startDate, endDate } = job.data

    const projectData = await this.projectsExportsService.getProjectData(
      projectId,
      startDate,
      endDate,
    )

    const exportTasks: { data: object[]; fileName: string }[] = [
      { data: projectData.analytics, fileName: 'analytics' },
      { data: projectData.captcha, fileName: 'captcha' },
      { data: projectData.customEvents, fileName: 'custom-events' },
      { data: projectData.performance, fileName: 'performance' },
    ]

    const convertTasks = exportTasks.map(async task => {
      await this.projectsExportsService.convertJSONtoCSV(
        task.data,
        id,
        task.fileName as FileName,
      )
    })

    await Promise.all(convertTasks)
  }
}
