import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Project } from './entity/project.entity'
import { ProjectService } from './project.service'
import { ProjectController } from './project.controller'
import { UserModule } from '../user/user.module'
import { AppLoggerModule } from '../logger/logger.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Project]),
    forwardRef(() => UserModule),
    AppLoggerModule
  ],
  providers: [ProjectService],
  exports: [ProjectService],
  controllers: [ProjectController],
})
export class ProjectModule {}
