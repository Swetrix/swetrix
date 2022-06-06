import { ForbiddenException, Injectable, BadRequestException, UnprocessableEntityException, InternalServerErrorException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as _isEmpty from 'lodash/isEmpty'
import * as _isString from 'lodash/isString'
import * as _isArray from 'lodash/isArray'
import * as _size from 'lodash/size'
import * as _join from 'lodash/join'
import * as _find from 'lodash/find'
import * as _map from 'lodash/map'
import * as _includes from 'lodash/includes'
import * as dayjs from 'dayjs'
import * as utc from 'dayjs/plugin/utc'

import { Pagination, PaginationOptionsInterface } from '../common/pagination'
import { Project } from './entity/project.entity'
import { ProjectShare } from './entity/project-share.entity'
import { ProjectDTO } from './dto/project.dto'
import { UserType } from './../user/entities/user.entity'
import {
  isValidPID, redisProjectCountCacheTimeout, getRedisUserCountKey, redis, clickhouse, isSelfhosted,
} from '../common/constants'

dayjs.extend(utc)

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    @InjectRepository(ProjectShare)
    private projectShareRepository: Repository<ProjectShare>,
  ) {}

  async paginate(options: PaginationOptionsInterface, where: Record<string, unknown> | undefined): Promise<Pagination<Project>> {
    const [results, total] = await this.projectsRepository.findAndCount({
      take: options.take || 100,
      skip: options.skip || 0,
      where,
      order: {
        name: 'ASC',
      },
      relations: ['share'],
    })

    return new Pagination<Project>({
      results,
      total,
    })
  }

  async count(): Promise<number> {
    return await this.projectsRepository.count()
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

  async createShare(share: ProjectShare): Promise<ProjectShare> {
    return this.projectShareRepository.save(share)
  }

  async deleteShare(id: string): Promise<any> {
    return this.projectShareRepository.delete(id)
  }

  async updateShare(id: string, share: ProjectShare): Promise<any> {
    return this.projectShareRepository.update(id, share)
  }

  async findShare(params: object): Promise<ProjectShare[]> {
    return this.projectShareRepository.find(params)
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

  allowedToView(project: Project, uid: string | null): void {
    if (project.public || uid === project.admin.id) {
      return
    } else {
      throw new ForbiddenException('You are not allowed to access this project')
    }
  }

  allowedToManage(project: Project, uid: string, roles: Array<UserType>): void {
    if (uid === project.admin.id || _includes(roles, UserType.ADMIN)) {
      return
    } else {
      throw new ForbiddenException('You are not allowed to access this project')
    }
  }

  async checkIfIDUnique(projectID: string): Promise<void> {
    const project = await this.findOne(projectID)

    if (project) {
      throw new BadRequestException('Selected project ID is already in use')
    }
  }

  checkIfIDUniqueClickhouse(projects: Array<object>, projectID: string): void {
    if (_find(projects, ({ id }) => id === projectID)) {
      throw new BadRequestException('Selected project ID is already in use')
    }
  }

  formatToClickhouse(project: Project): object {
    const updProject = { ...project }
    // @ts-ignore
    updProject.active = Number(updProject.active)
    // @ts-ignore
    updProject.public = Number(updProject.public)
    // @ts-ignore
    updProject.origins = _isString(updProject.origins) ? updProject.origins : _join(updProject.origins, ',')

    return updProject
  }

  formatFromClickhouse(project: object): object {
    const updProject = { ...project }
    // @ts-ignore
    updProject.active = Boolean(updProject.active)
    // @ts-ignore
    updProject.public = Boolean(updProject.public)

    return updProject
  }

  validateProject(projectDTO: ProjectDTO) {
    if (!isValidPID(projectDTO.id)) throw new UnprocessableEntityException('The provided Project ID (pid) is incorrect')
    if (_size(projectDTO.name) > 50) throw new UnprocessableEntityException('The project name is too long')
    if (!_isArray(projectDTO.origins)) throw new UnprocessableEntityException('The list of allowed origins has to be an array of strings')
    if (_size(_join(projectDTO.origins, ',')) > 300) throw new UnprocessableEntityException('The list of allowed origins has to be smaller than 300 symbols')
  }

  // Returns amount of existing events starting from month
  async getRedisCount(uid: string): Promise<number | null> {
    const countKey = getRedisUserCountKey(uid)
    let count: string | number = await redis.get(countKey)

    if (_isEmpty(count)) {
      const monthStart = dayjs.utc().startOf('month').format('YYYY-MM-DD HH:mm:ss')
      const monthEnd = dayjs.utc().endOf('month').format('YYYY-MM-DD HH:mm:ss')

      let pids

      if (isSelfhosted) {
        // selfhosted has no limits
        return 0
      } else {
        pids = await this.find({
          where: {
            admin: uid,
          },
          select: ['id'],
        })
      }

      if (_isEmpty(pids)) {
        return 0
      }

      const count_ev_query = `SELECT COUNT() FROM analytics WHERE pid IN (${_join(_map(pids, el => `'${el.id}'`), ',')}) AND created BETWEEN '${monthStart}' AND '${monthEnd}'`
      const count_custom_ev_query = `SELECT COUNT() FROM customEV WHERE pid IN (${_join(_map(pids, el => `'${el.id}'`), ',')}) AND created BETWEEN '${monthStart}' AND '${monthEnd}'`

      const pageviews = (await clickhouse.query(count_ev_query).toPromise())[0]['count()']
      const customEvents = (await clickhouse.query(count_custom_ev_query).toPromise())[0]['count()']

      count = pageviews + customEvents
      
      await redis.set(countKey, `${pageviews}`, 'EX', redisProjectCountCacheTimeout)
    } else {
      try {
        // @ts-ignore
        count = Number(count)
      } catch (e) {
        count = 0
        console.error(e)
        throw new InternalServerErrorException('Error while processing project')
      }
    }

    // @ts-ignore
    return count
  }
}
