import { Controller, Body, Query, Param, UseGuards, Get, Post, Put, Delete, BadRequestException, 
  HttpCode, NotFoundException } from '@nestjs/common'
import { ApiTags, ApiQuery, ApiResponse } from '@nestjs/swagger'

import { AnalyticsService } from './analytics.service'
import { ProjectService } from '../project/project.service'
import { UserType } from '../user/entities/user.entity'
import { Pagination } from '../common/pagination/pagination'
import { Analytics } from './entity/analytics.entity'
import { UserService } from '../user/user.service'
import { EventsDTO } from './dto/events.dto'
import { AppLoggerService } from '../logger/logger.service'

@ApiTags('Analytics')
@Controller('log')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly projectService: ProjectService,
    private readonly logger: AppLoggerService,
  ) {}

  
}
