import { HttpModule } from '@nestjs/axios'
import { BullModule } from '@nestjs/bull'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ProjectModule } from 'src/project/project.module'
import { ProjectExport } from './entity/project-export.entity'
import { ProjectsExportsController } from './projects-exports.controller'
import { ProjectsExportsProcessor } from './projects-exports.processor'
import { ProjectsExportsService } from './projects-exports.service'
import { ProjectExportRepository } from './repository/project-export.repository'

@Module({
  imports: [
    TypeOrmModule.forFeature([ProjectExport]),
    BullModule.registerQueue({ name: 'projects-exports' }),
    HttpModule,
    ConfigModule,
    ProjectModule,
  ],
  controllers: [ProjectsExportsController],
  providers: [
    ProjectsExportsService,
    ProjectExportRepository,
    ProjectsExportsProcessor,
  ],
})
export class ProjectsExportsModule {}
