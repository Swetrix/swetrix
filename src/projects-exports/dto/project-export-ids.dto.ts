import { IntersectionType } from '@nestjs/swagger'
import { ExportIdDto } from './export-id.dto'
import { ProjectIdDto } from './project-id.dto'

export class ProjectExportIdsDto extends IntersectionType(
  ProjectIdDto,
  ExportIdDto,
) {}
