import { Controller } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

@ApiTags('Projects Exports')
@Controller({ path: 'projects/:projectId/exports', version: '1' })
export class ProjectsExportsController {}
