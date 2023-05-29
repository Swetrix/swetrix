import { Processor } from '@nestjs/bull'

@Processor('projects-exports')
export class ProjectsExportsProcessor {}
