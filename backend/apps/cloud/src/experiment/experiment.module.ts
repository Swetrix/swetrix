import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ExperimentController } from './experiment.controller'
import { ExperimentService } from './experiment.service'
import { Experiment } from './entity/experiment.entity'
import { ExperimentVariant } from './entity/experiment-variant.entity'
import { UserModule } from '../user/user.module'
import { ProjectModule } from '../project/project.module'
import { AppLoggerModule } from '../logger/logger.module'
import { AnalyticsModule } from '../analytics/analytics.module'
import { GoalModule } from '../goal/goal.module'
import { FeatureFlagModule } from '../feature-flag/feature-flag.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Experiment, ExperimentVariant]),
    forwardRef(() => UserModule),
    forwardRef(() => ProjectModule),
    AppLoggerModule,
    forwardRef(() => AnalyticsModule),
    forwardRef(() => GoalModule),
    forwardRef(() => FeatureFlagModule),
  ],
  controllers: [ExperimentController],
  providers: [ExperimentService],
  exports: [ExperimentService],
})
export class ExperimentModule {}
