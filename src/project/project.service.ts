import { ForbiddenException, Injectable, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { Pagination, PaginationOptionsInterface } from '../common/pagination'
import { Project } from './entity/project.entity'
import { ProjectDTO } from './dto/project.dto'
import { User, UserType } from '../user/entities/user.entity'
import { UserService } from '../user/user.service'

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    private readonly userService: UserService
  ) {}

  async paginate(options: PaginationOptionsInterface, where: Record<string, unknown> | undefined): Promise<Pagination<Project>> {
    const [results, total] = await this.projectsRepository.findAndCount({
      take: options.take || 10,
      skip: options.skip || 0,
      where: where,
      order: {
        name: 'ASC',
      }
    })

    return new Pagination<Project>({
      results,
      total,
    })
  }

  count(): Promise<number> {
    return this.projectsRepository.count()
  }

  async create(project: ProjectDTO): Promise<Project> {
    return this.projectsRepository.save(project)
  }

  async update(id: string, ProjectDTO: ProjectDTO): Promise<any> {
    return this.projectsRepository.update(id, ProjectDTO)
  }

  async delete(id: string): Promise<any> {
    return this.projectsRepository.delete(id)
  }

  findOneWithRelations(id: string): Promise<Project | null> {
    return this.projectsRepository.findOne(id, { relations: ['user'] })
  }

  findOne(id: string): Promise<Project | null> {
    return this.projectsRepository.findOne(id)
  }

  findOneWhere(where: Record<string, unknown>): Promise<Project> {
    return this.projectsRepository.findOne({ where })
  }

  ifAllowedToManage(userId: string, project: Project): boolean {
    return userId === project.admin.id
  }

  async allowedToManage(projectId: string, userId: string): Promise<void> {
    const user = await this.userService.findOne(userId)
    const project = await this.findOne(projectId)

    // if (user.projects.some(({ id }) => project.id === id)) {
    if (this.ifAllowedToManage(user.id, project)) {
      return
    } else {
      throw new ForbiddenException('Not allowed to manage this project')
    }
  }

  async checkIfIDUnique(projectId: string): Promise<void> {
    const project = await this.findOne(projectId)

    if (project) {
      throw new BadRequestException('Selected project ID is already in use')
    }
  }
}
