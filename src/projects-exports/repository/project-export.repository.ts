import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProjectExport } from '../entity/project-export.entity'

@Injectable()
export class ProjectExportRepository {
  constructor(
    @InjectRepository(ProjectExport)
    private readonly projectExportRepository: Repository<ProjectExport>,
  ) {}
}
