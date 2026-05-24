import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import {
  FindManyOptions,
  FindOneOptions,
  Repository,
  EntityManager,
  DeleteResult,
  UpdateResult,
} from 'typeorm'
import { Pagination, PaginationOptionsInterface } from '../common/pagination'
import { clickhouse } from '../common/integrations/clickhouse'
import { FeatureFlag } from './entity/feature-flag.entity'
import {
  evaluateFlag as sharedEvaluateFlag,
  evaluateFlags as sharedEvaluateFlags,
  isScheduledChangeDue,
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

  async applyDueScheduledChanges(projectId: string): Promise<void> {
    const flags = await this.featureFlagRepository.find({
      where: { project: { id: projectId } },
    })

    await Promise.all(
      flags
        .filter((flag) => isScheduledChangeDue(flag.scheduledChange))
        .map((flag) =>
          this.featureFlagRepository.update(flag.id, {
            enabled: flag.scheduledChange?.enabled ?? flag.enabled,
            rolloutPercentage:
              flag.scheduledChange?.rolloutPercentage ?? flag.rolloutPercentage,
            scheduledChange: null,
          }),
        ),
    )
  }

  async getLastEvaluatedAtByFlagIds(
    projectId: string,
    flagIds: string[],
  ): Promise<Map<string, string>> {
    const result = new Map<string, string>()

    if (flagIds.length === 0) {
      return result
    }

    const query = `
      SELECT
        flagId,
        max(created) as lastEvaluatedAt
      FROM feature_flag_evaluations
      WHERE
        pid = {pid:FixedString(12)}
        AND flagId IN {flagIds:Array(String)}
      GROUP BY flagId
    `

    try {
      const { data } = await clickhouse
        .query({
          query,
          query_params: { pid: projectId, flagIds },
        })
        .then((resultSet) =>
          resultSet.json<{ flagId: string; lastEvaluatedAt: string }>(),
        )

      for (const row of data) {
        result.set(row.flagId, row.lastEvaluatedAt)
      }
    } catch {
      return result
    }

    return result
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
  ): Promise<UpdateResult> {
    const repository = manager
      ? manager.getRepository(FeatureFlag)
      : this.featureFlagRepository
    return repository.update(id, flagData)
  }

  async delete(id: string, manager?: EntityManager): Promise<DeleteResult> {
    const repository = manager
      ? manager.getRepository(FeatureFlag)
      : this.featureFlagRepository
    return repository.delete(id)
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
