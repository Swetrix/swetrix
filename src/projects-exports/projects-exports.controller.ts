import {
  Controller,
  UsePipes,
  ValidationPipe,
  Post,
  Param,
  Body,
  NotFoundException,
  Get,
  Query,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger'
import { ProjectService } from 'src/project/project.service'
import { CreateExportDto } from './dto/create-export.dto'
import { ProjectExportIdsDto } from './dto/project-export-ids.dto'
import { ProjectExportsDto } from './dto/project-exports.dto'
import { ProjectIdDto } from './dto/project-id.dto'
import { ProjectExport } from './entity/project-export.entity'
import { ProjectsExportsService } from './projects-exports.service'
import { ProjectExportRepository } from './repository/project-export.repository'

@ApiTags('Projects Exports')
@Controller({ path: 'projects/:projectId/exports', version: '1' })
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class ProjectsExportsController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly projectsExportsService: ProjectsExportsService,
    private readonly projectExportRepository: ProjectExportRepository,
  ) {}

  @ApiOperation({ summary: 'Create an export for a project' })
  @ApiCreatedResponse({ type: ProjectExport })
  @Post()
  async createProjectExport(
    @Param() { projectId }: ProjectIdDto,
    @Body() createExportDto: CreateExportDto,
  ): Promise<unknown> {
    const project = await this.projectService.findProjectById(projectId)

    if (!project) {
      throw new NotFoundException('Project not found.')
    }

    return this.projectsExportsService.createProjectExport(
      projectId,
      createExportDto,
    )
  }

  @ApiOperation({ summary: 'Get all exports for a project' })
  @ApiOkResponse({ type: ProjectExport, isArray: true })
  @Get()
  async getProjectExports(
    @Param() { projectId }: ProjectIdDto,
    @Query() { offset, limit }: ProjectExportsDto,
  ): Promise<{ exports: ProjectExport[]; count: number }> {
    const project = await this.projectService.findProjectById(projectId)

    if (!project) {
      throw new NotFoundException('Project not found.')
    }

    return this.projectExportRepository.findAndCountProjectExports(
      projectId,
      offset,
      limit,
    )
  }

  @ApiOperation({ summary: 'Get a specific export for a project' })
  @ApiOkResponse({ type: ProjectExport })
  @Get(':exportId')
  async getProjectExport(
    @Param() { projectId, exportId }: ProjectExportIdsDto,
  ): Promise<ProjectExport> {
    const projectExport =
      await this.projectExportRepository.findProjectExportById(
        projectId,
        exportId,
      )

    if (!projectExport) {
      throw new NotFoundException('Project export not found.')
    }

    return projectExport
  }
}
