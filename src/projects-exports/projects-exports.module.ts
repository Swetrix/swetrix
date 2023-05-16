import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ProjectExport } from './entity/project-export.entity'
import { ProjectsExportsController } from './projects-exports.controller'
import { ProjectsExportsService } from './projects-exports.service'
import { ProjectExportRepository } from './repository/project-export.repository'

@Module({
  imports: [TypeOrmModule.forFeature([ProjectExport])],
  controllers: [ProjectsExportsController],
  providers: [ProjectsExportsService, ProjectExportRepository],
})
export class ProjectsExportsModule {}
