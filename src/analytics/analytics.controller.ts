import { Controller, Body, Query, Param, UseGuards, Get, Post, Put, Delete, BadRequestException, 
  HttpCode, NotFoundException } from '@nestjs/common'
import { ApiTags, ApiQuery, ApiResponse } from '@nestjs/swagger'

import { AnalyticsService } from './analytics.service'
import { ProjectService } from '../project/project.service'
import { UserType } from '../user/entities/user.entity'
import { Pagination } from '../common/pagination/pagination'
import { Analytics } from './entities/analytics.entity'
import { UserService } from '../user/user.service'
import { PageviewsDTO } from './dto/pageviews.dto'
import { AppLoggerService } from '../logger/logger.service'

@ApiTags('Analytics')
@Controller('log')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly projectService: ProjectService,
    private readonly logger: AppLoggerService,
  ) {}

  @Post('/')
  async get(@Body() logDTO: PageviewsDTO): Promise<any> {
    this.logger.log({ logDTO }, 'POST /log')
    this.analyticsService.validate(logDTO)

    return
  }
}
