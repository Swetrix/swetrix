import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ProjectExport } from './entity/project-export.entity'
import { ProjectExportRepository } from './repository/project-export.repository'

@Module({
  imports: [TypeOrmModule.forFeature([ProjectExport])],
  providers: [ProjectExportRepository],
})
export class ProjectsExportsModule {}
