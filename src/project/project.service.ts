import { ForbiddenException, Injectable, BadRequestException, UnprocessableEntityException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as _isEmpty from 'lodash/isEmpty'
import * as _isArray from 'lodash/isArray'
import * as _size from 'lodash/size'
import * as _join from 'lodash/join'

import { Pagination, PaginationOptionsInterface } from '../common/pagination'
import { Project } from './entity/project.entity'
import { ProjectDTO } from './dto/project.dto'
import { UserService } from '../user/user.service'
import { isValidPID } from '../common/constants'

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

  async create(project: ProjectDTO | Project): Promise<Project> {
    return this.projectsRepository.save(project)
  }

  async update(id: string, projectDTO: ProjectDTO): Promise<any> {
    return this.projectsRepository.update(id, projectDTO)
  }

  async delete(id: string): Promise<any> {
    return this.projectsRepository.delete(id)
  }

  async deleteMultiple(pids: string[]): Promise<any> {
    return this.projectsRepository.createQueryBuilder()
      .delete()
      .where(`id IN (${pids})`)
      .execute()
  }

  findOneWithRelations(id: string): Promise<Project | null> {
    return this.projectsRepository.findOne(id, { relations: ['admin'] })
  }

  findOne(id: string, params: Object = {}): Promise<Project | null> {
    return this.projectsRepository.findOne(id, params)
  }

  findWhere(where: Record<string, unknown>): Promise<Project[]> {
    return this.projectsRepository.find({ where })
  }

  find(params: object): Promise<Project[]> {
    return this.projectsRepository.find(params)
  }

  findOneWhere(where: Record<string, unknown>, params: object = {}): Promise<Project> {
    return this.projectsRepository.findOne({ where, ...params })
  }

  ifAllowedToManage(userId: string, project: Project): boolean {
    return userId === project.admin.id
  }

  async allowedToManage(project: Project, userId: string): Promise<void> {
    const user = await this.userService.findOne(userId)

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

  validateProject(projectDTO: ProjectDTO) {
    if (!isValidPID(projectDTO.id)) throw new UnprocessableEntityException('The provided Project ID (pid) is incorrect')
    if (_size(projectDTO.name) > 50) throw new UnprocessableEntityException('The project name is too long')
    if (!_isArray(projectDTO.origins)) throw new UnprocessableEntityException('The list of allowed origins has to be an array of strings')
    if (_size(_join(projectDTO.origins, ',')) > 300) throw new UnprocessableEntityException('The list of allowed origins has to be smaller than 300 symbols')
  }
}
