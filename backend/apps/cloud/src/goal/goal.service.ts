import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { FindManyOptions, FindOneOptions, Repository, ILike } from 'typeorm'
import { Pagination, PaginationOptionsInterface } from '../common/pagination'
import { Goal } from './entity/goal.entity'

@Injectable()
export class GoalService {
  constructor(
    @InjectRepository(Goal)
    private goalsRepository: Repository<Goal>,
  ) {}

  async paginate(
    options: PaginationOptionsInterface,
    where: FindManyOptions<Goal>['where'],
    relations?: Array<string>,
    search?: string,
  ): Promise<Pagination<Goal>> {
    const take =
      typeof options.take === 'number' && Number.isFinite(options.take)
        ? Math.min(Math.max(options.take, 1), 250)
        : 100
    const skip =
      typeof options.skip === 'number' && Number.isFinite(options.skip)
        ? Math.min(Math.max(options.skip, 0), 50_000)
        : 0

    let finalWhere: FindManyOptions<Goal>['where'] = where

    if (search && search.trim()) {
      const searchPattern = `%${search.trim()}%`
      // Use array of where conditions for OR with the base where conditions
      finalWhere = [
        { ...where, name: ILike(searchPattern) },
        { ...where, value: ILike(searchPattern) },
      ]
    }

    const [results, total] = await this.goalsRepository.findAndCount({
      take,
      skip,
      where: finalWhere,
      order: {
        name: 'ASC',
      },
      relations,
    })

    return new Pagination<Goal>({
      results,
      total,
    })
  }

  findOneWithRelations(id: string): Promise<Goal | null> {
    return this.goalsRepository.findOne({
      where: { id },
      relations: ['project', 'project.admin'],
    })
  }

  async count(options: FindManyOptions<Goal> = {}): Promise<number> {
    return this.goalsRepository.count(options)
  }

  findOne(options: FindOneOptions<Goal>): Promise<Goal | null> {
    return this.goalsRepository.findOne(options)
  }

  find(options: FindManyOptions<Goal>): Promise<Goal[]> {
    return this.goalsRepository.find(options)
  }

  findByProject(projectId: string): Promise<Goal[]> {
    return this.goalsRepository.find({
      where: { project: { id: projectId }, active: true },
      order: { name: 'ASC' },
    })
  }

  async create(goalData: Partial<Goal>): Promise<Goal> {
    return this.goalsRepository.save(goalData)
  }

  async update(id: string, goalData: Partial<Goal>): Promise<any> {
    return this.goalsRepository.update(id, goalData)
  }

  async delete(id: string): Promise<any> {
    return this.goalsRepository.delete(id)
  }
}
