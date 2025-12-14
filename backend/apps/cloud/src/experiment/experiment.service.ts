import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { FindManyOptions, FindOneOptions, Repository } from 'typeorm'
import { Pagination, PaginationOptionsInterface } from '../common/pagination'
import { Experiment } from './entity/experiment.entity'
import { ExperimentVariant } from './entity/experiment-variant.entity'

@Injectable()
export class ExperimentService {
  constructor(
    @InjectRepository(Experiment)
    private experimentRepository: Repository<Experiment>,
    @InjectRepository(ExperimentVariant)
    private variantRepository: Repository<ExperimentVariant>,
  ) {}

  async paginate(
    options: PaginationOptionsInterface,
    projectId: string,
  ): Promise<Pagination<Experiment>> {
    const queryBuilder = this.experimentRepository
      .createQueryBuilder('experiment')
      .leftJoinAndSelect('experiment.project', 'project')
      .leftJoinAndSelect('experiment.variants', 'variants')
      .leftJoinAndSelect('experiment.goal', 'goal')
      .leftJoinAndSelect('experiment.featureFlag', 'featureFlag')
      .where('project.id = :projectId', { projectId })

    queryBuilder
      .orderBy('experiment.created', 'DESC')
      .take(options.take || 100)
      .skip(options.skip || 0)

    const [results, total] = await queryBuilder.getManyAndCount()

    return new Pagination<Experiment>({
      results,
      total,
    })
  }

  findOneWithRelations(id: string): Promise<Experiment | null> {
    return this.experimentRepository.findOne({
      where: { id },
      relations: [
        'project',
        'project.admin',
        'variants',
        'goal',
        'featureFlag',
      ],
    })
  }

  async count(options: FindManyOptions<Experiment> = {}): Promise<number> {
    return this.experimentRepository.count(options)
  }

  findOne(options: FindOneOptions<Experiment>): Promise<Experiment | null> {
    return this.experimentRepository.findOne(options)
  }

  find(options: FindManyOptions<Experiment>): Promise<Experiment[]> {
    return this.experimentRepository.find(options)
  }

  findByProject(projectId: string): Promise<Experiment[]> {
    return this.experimentRepository.find({
      where: { project: { id: projectId } },
      relations: ['variants', 'goal', 'featureFlag'],
      order: { created: 'DESC' },
    })
  }

  async create(experimentData: Partial<Experiment>): Promise<Experiment> {
    return this.experimentRepository.save(experimentData)
  }

  async update(id: string, experimentData: Partial<Experiment>): Promise<any> {
    return this.experimentRepository.update(id, experimentData)
  }

  async delete(id: string): Promise<any> {
    return this.experimentRepository.delete(id)
  }

  async createVariant(
    variantData: Partial<ExperimentVariant>,
  ): Promise<ExperimentVariant> {
    return this.variantRepository.save(variantData)
  }

  async updateVariant(
    id: string,
    variantData: Partial<ExperimentVariant>,
  ): Promise<any> {
    return this.variantRepository.update(id, variantData)
  }

  async deleteVariant(id: string): Promise<any> {
    return this.variantRepository.delete(id)
  }

  async deleteVariantsByExperiment(experimentId: string): Promise<any> {
    return this.variantRepository.delete({ experiment: { id: experimentId } })
  }

  async findVariantsByExperiment(
    experimentId: string,
  ): Promise<ExperimentVariant[]> {
    return this.variantRepository.find({
      where: { experiment: { id: experimentId } },
    })
  }
}
