import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { FindManyOptions, FindOneOptions, Repository } from 'typeorm'
import { Pagination, PaginationOptionsInterface } from '../common/pagination'
import { Goal } from './entity/goal.entity'
import { CreateGoalDto, UpdateGoalDto } from './dto/goal.dto'

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
  ): Promise<Pagination<Goal>> {
    const [results, total] = await this.goalsRepository.findAndCount({
      take: options.take || 100,
      skip: options.skip || 0,
      where,
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
