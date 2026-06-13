import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SessionReplayS3Service } from '../analytics/session-replay-s3.service'
import { Experiment } from '../experiment/entity/experiment.entity'
import { ExperimentVariant } from '../experiment/entity/experiment-variant.entity'
import { FeatureFlag } from '../feature-flag/entity/feature-flag.entity'
import { Goal } from '../goal/entity/goal.entity'
import { Annotation, Funnel, Project } from '../project/entity'
import { ProjectViewCustomEventEntity } from '../project/entity/project-view-custom-event.entity'
import { ProjectViewEntity } from '../project/entity/project-view.entity'
import { DemoDataService } from './demo-data.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Annotation,
      Experiment,
      ExperimentVariant,
      FeatureFlag,
      Funnel,
      Goal,
      Project,
      ProjectViewCustomEventEntity,
      ProjectViewEntity,
    ]),
  ],
  providers: [DemoDataService, SessionReplayS3Service],
  exports: [DemoDataService],
})
export class DemoDataModule {}
