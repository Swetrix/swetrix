import { Controller, Post, Get } from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger'
import { ExportId } from './decorator/export-id.decorator'
import { ProjectId } from './decorator/project-id.decorator'
import { ProjectExport } from './entity/project-export.entity'

@ApiTags('Projects Exports')
@Controller({ path: 'projects/:projectId/exports', version: '1' })
export class ProjectsExportsController {
  @ApiOperation({ summary: 'Create an export for a project' })
  @ApiCreatedResponse({ type: ProjectExport })
  @Post()
  async createExport(@ProjectId() projectId: string): Promise<unknown> {
    return {}
  }

  @ApiOperation({ summary: 'Get all exports for a project' })
  @ApiOkResponse({ type: ProjectExport, isArray: true })
  @Get()
  async getExports(@ProjectId() projectId: string): Promise<unknown[]> {
    return []
  }

  @ApiOperation({ summary: 'Get a specific export for a project' })
  @ApiOkResponse({ type: ProjectExport })
  @Get(':exportId')
  async getExport(
    @ProjectId() projectId: string,
    @ExportId() exportId: string,
  ): Promise<unknown> {
    return {}
  }
}
