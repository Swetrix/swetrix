import { Injectable } from '@nestjs/common'
import { randomUUID } from 'crypto'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import _filter from 'lodash/filter'
import _head from 'lodash/head'
import _isEmpty from 'lodash/isEmpty'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import _reduce from 'lodash/reduce'

import { clickhouse } from '../common/integrations/clickhouse'
import { Pagination } from '../common/pagination/pagination'
import { PaginationOptionsInterface } from '../common/pagination/pagination.results.interface'
import {
  ClickhouseExperiment,
  Experiment,
  ExperimentStatus,
  ExposureTrigger,
  MultipleVariantHandling,
  FeatureFlagMode,
} from './entity/experiment.entity'
import {
  ClickhouseExperimentVariant,
  ExperimentVariant,
} from './entity/experiment-variant.entity'

dayjs.extend(utc)

const ALLOWED_EXPERIMENT_KEYS = [
  'name',
  'description',
  'hypothesis',
  'status',
  'exposureTrigger',
  'customEventName',
  'multipleVariantHandling',
  'filterInternalUsers',
  'featureFlagMode',
  'featureFlagKey',
  'startedAt',
  'endedAt',
  'goalId',
  'featureFlagId',
]

const NULLABLE_EXPERIMENT_KEYS = [
  'description',
  'hypothesis',
  'customEventName',
  'featureFlagKey',
  'startedAt',
  'endedAt',
  'goalId',
  'featureFlagId',
]

@Injectable()
export class ExperimentService {
  formatVariantFromClickhouse(
    variant: ClickhouseExperimentVariant,
  ): ExperimentVariant | null {
    if (!variant) {
      return null
    }

    return {
      id: variant.id,
      experimentId: variant.experimentId,
      name: variant.name,
      key: variant.key,
      description: variant.description || null,
      rolloutPercentage: Number(variant.rolloutPercentage),
      isControl: Boolean(variant.isControl),
    }
  }

  formatExperimentFromClickhouse(
    experiment: ClickhouseExperiment,
    variants: ExperimentVariant[] = [],
  ): Experiment | null {
    if (!experiment) {
      return null
    }

    return {
      id: experiment.id,
      name: experiment.name,
      description: experiment.description || null,
      hypothesis: experiment.hypothesis || null,
      status: experiment.status as ExperimentStatus,
      exposureTrigger: experiment.exposureTrigger as ExposureTrigger,
      customEventName: experiment.customEventName || null,
      multipleVariantHandling:
        experiment.multipleVariantHandling as MultipleVariantHandling,
      filterInternalUsers: Boolean(experiment.filterInternalUsers),
      featureFlagMode: experiment.featureFlagMode as FeatureFlagMode,
      featureFlagKey: experiment.featureFlagKey || null,
      startedAt: experiment.startedAt || null,
      endedAt: experiment.endedAt || null,
      projectId: experiment.projectId,
      goalId: experiment.goalId || null,
      featureFlagId: experiment.featureFlagId || null,
      variants,
      created: experiment.created,
    }
  }

  private formatExperimentToClickhouse(
    experiment: Partial<Experiment>,
  ): Partial<ClickhouseExperiment> {
    const result: Partial<ClickhouseExperiment> = {}
    const writableResult = result as Record<string, any>

    for (const key of ALLOWED_EXPERIMENT_KEYS) {
      if (experiment[key as keyof Experiment] !== undefined) {
        writableResult[key] = experiment[key as keyof Experiment]
      }
    }

    if (experiment.id !== undefined) {
      result.id = experiment.id
    }

    if (experiment.projectId !== undefined) {
      result.projectId = experiment.projectId
    }

    if (experiment.created !== undefined) {
      result.created = experiment.created
    }

    if (experiment.filterInternalUsers !== undefined) {
      result.filterInternalUsers = experiment.filterInternalUsers ? 1 : 0
    }

    return result
  }

  private async getVariantsForExperiments(
    experimentIds: string[],
  ): Promise<Map<string, ExperimentVariant[]>> {
    const variantsByExperiment = new Map<string, ExperimentVariant[]>()

    if (_isEmpty(experimentIds)) {
      return variantsByExperiment
    }

    const { data } = await clickhouse
      .query({
        query: `
          SELECT *
          FROM experiment_variant
          WHERE experimentId IN {experimentIds:Array(String)}
          ORDER BY key ASC
        `,
        query_params: { experimentIds },
      })
      .then((resultSet) => resultSet.json<ClickhouseExperimentVariant>())

    for (const row of data) {
      const variant = this.formatVariantFromClickhouse(row)
      if (!variant) {
        continue
      }

      const list = variantsByExperiment.get(variant.experimentId) || []
      list.push(variant)
      variantsByExperiment.set(variant.experimentId, list)
    }

    return variantsByExperiment
  }

  private async hydrateExperiments(
    rows: ClickhouseExperiment[],
  ): Promise<Experiment[]> {
    const variantsByExperiment = await this.getVariantsForExperiments(
      rows.map((row) => row.id),
    )

    return _map(rows, (row) =>
      this.formatExperimentFromClickhouse(
        row,
        variantsByExperiment.get(row.id) || [],
      ),
    ).filter((experiment): experiment is Experiment => experiment !== null)
  }

  async paginate(
    options: PaginationOptionsInterface,
    projectId: string,
    search?: string,
  ): Promise<Pagination<Experiment>> {
    const take =
      typeof options.take === 'number' && Number.isFinite(options.take)
        ? Math.min(Math.max(options.take, 1), 200)
        : 100
    const skip =
      typeof options.skip === 'number' && Number.isFinite(options.skip)
        ? Math.max(options.skip, 0)
        : 0

    const searchCondition = search?.trim()
      ? `AND (name ILIKE concat('%', {search:String}, '%') OR description ILIKE concat('%', {search:String}, '%'))`
      : ''
    const queryParams: Record<string, any> = { projectId, take, skip }

    if (search?.trim()) {
      queryParams.search = search.trim()
    }

    const [countResult, dataResult] = await Promise.all([
      clickhouse
        .query({
          query: `
            SELECT count() as total
            FROM experiment
            WHERE projectId = {projectId:FixedString(12)}
            ${searchCondition}
          `,
          query_params: queryParams,
        })
        .then((resultSet) => resultSet.json<{ total: number }>()),
      clickhouse
        .query({
          query: `
            SELECT *
            FROM experiment
            WHERE projectId = {projectId:FixedString(12)}
            ${searchCondition}
            ORDER BY created DESC
            LIMIT {take:UInt32} OFFSET {skip:UInt32}
          `,
          query_params: queryParams,
        })
        .then((resultSet) => resultSet.json<ClickhouseExperiment>()),
    ])

    return new Pagination<Experiment>({
      results: await this.hydrateExperiments(dataResult.data),
      total: Number(countResult.data[0]?.total || 0),
    })
  }

  async count(projectId: string): Promise<number> {
    const { data } = await clickhouse
      .query({
        query: `
          SELECT count() as total
          FROM experiment
          WHERE projectId = {projectId:FixedString(12)}
        `,
        query_params: { projectId },
      })
      .then((resultSet) => resultSet.json<{ total: number }>())

    return Number(data[0]?.total || 0)
  }

  async findOne(id: string): Promise<Experiment | null> {
    const { data } = await clickhouse
      .query({
        query: `
          SELECT *
          FROM experiment
          WHERE id = {id:String}
          LIMIT 1
        `,
        query_params: { id },
      })
      .then((resultSet) => resultSet.json<ClickhouseExperiment>())

    if (_isEmpty(data)) {
      return null
    }

    return _head(await this.hydrateExperiments([_head(data)])) || null
  }

  findOneWithRelations(id: string): Promise<Experiment | null> {
    return this.findOne(id)
  }

  async findByProject(projectId: string): Promise<Experiment[]> {
    const { data } = await clickhouse
      .query({
        query: `
          SELECT *
          FROM experiment
          WHERE projectId = {projectId:FixedString(12)}
          ORDER BY created DESC
        `,
        query_params: { projectId },
      })
      .then((resultSet) => resultSet.json<ClickhouseExperiment>())

    return this.hydrateExperiments(data)
  }

  async findRunningByIds(
    experimentIds: Array<string | null>,
    exposureTrigger: ExposureTrigger,
  ): Promise<Experiment[]> {
    const ids = experimentIds.filter((id): id is string => Boolean(id))

    if (_isEmpty(ids)) {
      return []
    }

    const { data } = await clickhouse
      .query({
        query: `
          SELECT *
          FROM experiment
          WHERE id IN {ids:Array(String)}
            AND status = {status:String}
            AND exposureTrigger = {exposureTrigger:String}
        `,
        query_params: {
          ids,
          status: ExperimentStatus.RUNNING,
          exposureTrigger,
        },
      })
      .then((resultSet) => resultSet.json<ClickhouseExperiment>())

    return this.hydrateExperiments(data)
  }

  async findRunningCustomEventExperiments(
    projectId: string,
    customEventName: string,
  ): Promise<Experiment[]> {
    const { data } = await clickhouse
      .query({
        query: `
          SELECT *
          FROM experiment
          WHERE projectId = {projectId:FixedString(12)}
            AND status = {status:String}
            AND exposureTrigger = {exposureTrigger:String}
            AND customEventName = {customEventName:String}
        `,
        query_params: {
          projectId,
          status: ExperimentStatus.RUNNING,
          exposureTrigger: ExposureTrigger.CUSTOM_EVENT,
          customEventName,
        },
      })
      .then((resultSet) => resultSet.json<ClickhouseExperiment>())

    return this.hydrateExperiments(data)
  }

  async create(experimentData: Partial<Experiment>): Promise<Experiment> {
    const id = randomUUID()
    const created = dayjs.utc().format('YYYY-MM-DD HH:mm:ss')
    const variants = experimentData.variants || []

    const experiment: Experiment = {
      id,
      name: experimentData.name,
      description: experimentData.description || null,
      hypothesis: experimentData.hypothesis || null,
      status: experimentData.status || ExperimentStatus.DRAFT,
      exposureTrigger:
        experimentData.exposureTrigger || ExposureTrigger.FEATURE_FLAG,
      customEventName: experimentData.customEventName || null,
      multipleVariantHandling:
        experimentData.multipleVariantHandling ||
        MultipleVariantHandling.EXCLUDE,
      filterInternalUsers: experimentData.filterInternalUsers !== false,
      featureFlagMode: experimentData.featureFlagMode || FeatureFlagMode.CREATE,
      featureFlagKey: experimentData.featureFlagKey || null,
      startedAt: experimentData.startedAt || null,
      endedAt: experimentData.endedAt || null,
      projectId: experimentData.projectId,
      goalId: experimentData.goalId || null,
      featureFlagId: experimentData.featureFlagId || null,
      variants: [],
      created,
    }

    await clickhouse.insert({
      table: 'experiment',
      format: 'JSONEachRow',
      values: [
        {
          ...this.formatExperimentToClickhouse(experiment),
          filterInternalUsers: experiment.filterInternalUsers ? 1 : 0,
        },
      ],
    })

    experiment.variants = await this.insertVariants(id, variants)

    return experiment
  }

  async update(
    id: string,
    experimentData: Partial<Experiment>,
  ): Promise<Experiment | null> {
    const existing = await this.findOne(id)

    if (!existing) {
      return null
    }

    const filtered = _reduce(
      _filter(
        _keys(experimentData),
        (key) =>
          ALLOWED_EXPERIMENT_KEYS.includes(key) &&
          experimentData[key as keyof Experiment] !== undefined,
      ),
      (obj, key) => {
        obj[key] = experimentData[key as keyof Experiment]
        return obj
      },
      {} as Record<string, any>,
    )

    const columns = _keys(filtered)

    if (!_isEmpty(columns)) {
      const formattedData = this.formatExperimentToClickhouse(filtered)
      const params: Record<string, any> = { id }

      const assignments = _map(columns, (col) => {
        const value = formattedData[col as keyof ClickhouseExperiment]
        params[col] = value

        if (col === 'filterInternalUsers') {
          return `${col}={${col}:Int8}`
        }

        if (value === null && NULLABLE_EXPERIMENT_KEYS.includes(col)) {
          return `${col}=NULL`
        }

        return `${col}={${col}:String}`
      }).join(', ')

      await clickhouse.command({
        query: `ALTER TABLE experiment UPDATE ${assignments} WHERE id={id:String}`,
        query_params: params,
      })
    }

    return {
      ...existing,
      ...(filtered as Partial<Experiment>),
    }
  }

  async delete(id: string): Promise<void> {
    await clickhouse.command({
      query: `ALTER TABLE experiment_variant DELETE WHERE experimentId = {id:String}`,
      query_params: { id },
    })

    await clickhouse.command({
      query: `ALTER TABLE experiment DELETE WHERE id = {id:String}`,
      query_params: { id },
    })
  }

  async recreateVariants(
    experimentId: string,
    variantsData: Partial<ExperimentVariant>[],
  ): Promise<ExperimentVariant[]> {
    await clickhouse.command({
      query: `ALTER TABLE experiment_variant DELETE WHERE experimentId = {experimentId:String}`,
      query_params: { experimentId },
    })

    return this.insertVariants(experimentId, variantsData)
  }

  private async insertVariants(
    experimentId: string,
    variantsData: Partial<ExperimentVariant>[],
  ): Promise<ExperimentVariant[]> {
    if (_isEmpty(variantsData)) {
      return []
    }

    const variants: ExperimentVariant[] = variantsData.map((variant) => ({
      id: randomUUID(),
      experimentId,
      name: variant.name,
      key: variant.key,
      description: variant.description || null,
      rolloutPercentage: variant.rolloutPercentage,
      isControl: variant.isControl,
    }))

    await clickhouse.insert({
      table: 'experiment_variant',
      format: 'JSONEachRow',
      values: variants.map((variant) => ({
        ...variant,
        isControl: variant.isControl ? 1 : 0,
      })),
    })

    return variants
  }
}
