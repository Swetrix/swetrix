import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { ApiProperty } from '@nestjs/swagger'
import { Project } from '../../project/entity/project.entity'
import { FeatureFlag } from '../../feature-flag/entity/feature-flag.entity'
import { Goal } from '../../goal/entity/goal.entity'
import { ExperimentVariant } from './experiment-variant.entity'

export enum ExperimentStatus {
  DRAFT = 'draft',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
}

export enum ExposureTrigger {
  FEATURE_FLAG = 'feature_flag',
  CUSTOM_EVENT = 'custom_event',
}

export enum MultipleVariantHandling {
  EXCLUDE = 'exclude',
  FIRST_EXPOSURE = 'first_exposure',
}

export enum FeatureFlagMode {
  CREATE = 'create',
  LINK = 'link',
}

@Entity()
export class Experiment {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ApiProperty()
  @Column('varchar', { length: 100 })
  name: string

  @ApiProperty()
  @Column('varchar', { length: 500, nullable: true })
  description: string | null

  @ApiProperty()
  @Column('varchar', { length: 500, nullable: true })
  hypothesis: string | null

  @ApiProperty()
  @Column({
    type: 'enum',
    enum: ExperimentStatus,
    default: ExperimentStatus.DRAFT,
  })
  status: ExperimentStatus

  @ApiProperty()
  @Column({
    type: 'enum',
    enum: ExposureTrigger,
    default: ExposureTrigger.FEATURE_FLAG,
  })
  exposureTrigger: ExposureTrigger

  @ApiProperty()
  @Column('varchar', { length: 200, nullable: true })
  customEventName: string | null

  @ApiProperty()
  @Column({
    type: 'enum',
    enum: MultipleVariantHandling,
    default: MultipleVariantHandling.EXCLUDE,
  })
  multipleVariantHandling: MultipleVariantHandling

  @ApiProperty()
  @Column('boolean', { default: true })
  filterInternalUsers: boolean

  @ApiProperty()
  @Column({
    type: 'enum',
    enum: FeatureFlagMode,
    default: FeatureFlagMode.CREATE,
  })
  featureFlagMode: FeatureFlagMode

  @ApiProperty()
  @Column('varchar', { length: 100, nullable: true })
  featureFlagKey: string | null

  @ApiProperty()
  @Column('datetime', { nullable: true })
  startedAt: Date | null

  @ApiProperty()
  @Column('datetime', { nullable: true })
  endedAt: Date | null

  @ApiProperty({ type: () => Project })
  @ManyToOne(() => Project, (project) => project.experiments)
  @JoinColumn()
  project: Project

  @ApiProperty({ type: () => FeatureFlag })
  @OneToOne(() => FeatureFlag, { nullable: true })
  @JoinColumn()
  featureFlag: FeatureFlag | null

  @ApiProperty({ type: () => Goal })
  @ManyToOne(() => Goal, { nullable: true })
  @JoinColumn()
  goal: Goal | null

  @ApiProperty({ type: () => [ExperimentVariant] })
  @OneToMany(() => ExperimentVariant, (variant) => variant.experiment, {
    cascade: true,
  })
  variants: ExperimentVariant[]

  @ApiProperty()
  @CreateDateColumn()
  created: Date
}
