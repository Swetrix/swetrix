import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import {
  FindManyOptions,
  FindOneOptions,
  Repository,
  EntityManager,
  DeleteResult,
} from 'typeorm'
import { Pagination, PaginationOptionsInterface } from '../common/pagination'
import { FeatureFlag } from './entity/feature-flag.entity'
import {
  evaluateFlag as sharedEvaluateFlag,
  evaluateFlags as sharedEvaluateFlags,
} from './evaluation'

@Injectable()
export class FeatureFlagService {
  constructor(
    @InjectRepository(FeatureFlag)
    private featureFlagRepository: Repository<FeatureFlag>,
  ) {}

  async paginate(
    options: PaginationOptionsInterface,
    projectId: string,
    search?: string,
  ): Promise<Pagination<FeatureFlag>> {
    const safeTake =
      typeof options.take === 'number' && Number.isFinite(options.take)
        ? Math.min(Math.max(options.take, 0), 100)
        : 100
    const safeSkip =
      typeof options.skip === 'number' && Number.isFinite(options.skip)
        ? Math.max(options.skip, 0)
        : 0

    const queryBuilder = this.featureFlagRepository
      .createQueryBuilder('flag')
      .leftJoinAndSelect('flag.project', 'project')
      .where('project.id = :projectId', { projectId })

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`
      queryBuilder.andWhere(
        '(LOWER(flag.key) LIKE LOWER(:search) OR LOWER(flag.description) LIKE LOWER(:search))',
        { search: searchTerm },
      )
    }

    queryBuilder.orderBy('flag.key', 'ASC').take(safeTake).skip(safeSkip)

    const [results, total] = await queryBuilder.getManyAndCount()

    return new Pagination<FeatureFlag>({
      results,
      total,
    })
  }

  findOneWithRelations(id: string): Promise<FeatureFlag | null> {
    return this.featureFlagRepository.findOne({
      where: { id },
      relations: ['project', 'project.admin'],
    })
  }

  async count(options: FindManyOptions<FeatureFlag> = {}): Promise<number> {
    return this.featureFlagRepository.count(options)
  }

  findOne(options: FindOneOptions<FeatureFlag>): Promise<FeatureFlag | null> {
    return this.featureFlagRepository.findOne(options)
  }

  find(options: FindManyOptions<FeatureFlag>): Promise<FeatureFlag[]> {
    return this.featureFlagRepository.find(options)
  }

  findByProject(projectId: string): Promise<FeatureFlag[]> {
    return this.featureFlagRepository.find({
      where: { project: { id: projectId } },
      order: { key: 'ASC' },
    })
  }

  findEnabledByProject(projectId: string): Promise<FeatureFlag[]> {
    return this.featureFlagRepository.find({
      where: { project: { id: projectId }, enabled: true },
      order: { key: 'ASC' },
    })
  }

  async create(
    flagData: Partial<FeatureFlag>,
    manager?: EntityManager,
  ): Promise<FeatureFlag> {
    const repository = manager
      ? manager.getRepository(FeatureFlag)
      : this.featureFlagRepository
    return repository.save(flagData)
  }

  async update(
    id: string,
    flagData: Partial<FeatureFlag>,
    manager?: EntityManager,
  ): Promise<any> {
    const repository = manager
      ? manager.getRepository(FeatureFlag)
      : this.featureFlagRepository
    return repository.update(id, flagData)
  }

  async delete(id: string): Promise<DeleteResult> {
    return this.featureFlagRepository.delete(id)
  }

  /**
   * Evaluates all feature flags for a project given visitor attributes
   */
  evaluateFlags(
    flags: FeatureFlag[],
    profileId: string,
    attributes?: Record<string, string>,
  ): Record<string, boolean> {
    return sharedEvaluateFlags(flags, profileId, attributes)
  }

  /**
   * Evaluates a single feature flag for a visitor
   */
  evaluateFlag(
    flag: FeatureFlag,
    profileId: string,
    attributes?: Record<string, string>,
  ): boolean {
    return sharedEvaluateFlag(flag, profileId, attributes)
  }
}
