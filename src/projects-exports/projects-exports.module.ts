import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ProjectModule } from 'src/project/project.module'
import { ProjectExport } from './entity/project-export.entity'
import { ProjectsExportsController } from './projects-exports.controller'
import { ProjectsExportsService } from './projects-exports.service'
import { ProjectExportRepository } from './repository/project-export.repository'

@Module({
  imports: [TypeOrmModule.forFeature([ProjectExport]), ProjectModule],
  controllers: [ProjectsExportsController],
  providers: [ProjectsExportsService, ProjectExportRepository],
})
export class ProjectsExportsModule {}
