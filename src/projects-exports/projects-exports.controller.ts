import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger'
import { CreateExportDto } from './dto/create-export.dto'
import { IsExportIdDto } from './dto/is-export-id.dto'
import { IsProjectIdDto } from './dto/is-project-id.dto'
import { ProjectExport } from './entity/project-export.entity'
import { ProjectExportRepository } from './repository/project-export.repository'

@ApiTags('Projects Exports')
@Controller({ path: 'projects/:projectId/exports', version: '1' })
export class ProjectsExportsController {
  constructor(
    private readonly projectExportRepository: ProjectExportRepository,
  ) {}

  @ApiOperation({ summary: 'Create an export for a project' })
  @ApiCreatedResponse({ type: ProjectExport })
  @Post()
  async createProjectExport(
    @Body() createExportDto: CreateExportDto,
    @Param() { projectId }: IsProjectIdDto,
  ): Promise<unknown> {
    return {}
  }

  @ApiOperation({ summary: 'Get all exports for a project' })
  @ApiOkResponse({ type: ProjectExport, isArray: true })
  @Get()
  async getProjectExports(
    @Param() { projectId }: IsProjectIdDto,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ): Promise<{ exports: ProjectExport[]; count: number }> {
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
    @Param() { projectId, exportId }: IsProjectIdDto & IsExportIdDto,
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
