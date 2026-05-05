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

export interface Experiment {
  id: string
  name: string
  description: string | null
  hypothesis: string | null
  status: ExperimentStatus
  exposureTrigger: ExposureTrigger
  customEventName: string | null
  multipleVariantHandling: MultipleVariantHandling
  filterInternalUsers: boolean
  featureFlagMode: FeatureFlagMode
  featureFlagKey: string | null
  startedAt: string | null
  endedAt: string | null
  projectId: string
  goalId: string | null
  featureFlagId: string | null
  variants: ExperimentVariant[]
  project?: Project
  goal?: Goal | null
  featureFlag?: FeatureFlag | null
  created: string
}

export interface ClickhouseExperiment {
  id: string
  name: string
  description: string | null
  hypothesis: string | null
  status: string
  exposureTrigger: string
  customEventName: string | null
  multipleVariantHandling: string
  filterInternalUsers: number
  featureFlagMode: string
  featureFlagKey: string | null
  startedAt: string | null
  endedAt: string | null
  projectId: string
  goalId: string | null
  featureFlagId: string | null
  created: string
}
