import { Controller, Body, Query, Param, UseGuards, Get, Post, Put, Delete, BadRequestException, 
  HttpCode, NotFoundException, InternalServerErrorException } from '@nestjs/common'
import { ApiTags, ApiQuery, ApiResponse } from '@nestjs/swagger'

import { AnalyticsService } from './analytics.service'
import { ProjectService } from '../project/project.service'
import { UserType } from '../user/entities/user.entity'
import { Pagination } from '../common/pagination/pagination'
import { Analytics } from './entities/analytics.entity'
import { UserService } from '../user/user.service'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from 'src/common/guards/roles.guard'
import { PageviewsDTO } from './dto/pageviews.dto'
import { AppLoggerService } from '../logger/logger.service'

@ApiTags('Analytics')
@UseGuards(RolesGuard)
@Controller('log')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly projectService: ProjectService,
    private readonly logger: AppLoggerService,
  ) {}

  @Get('/')
  @UseGuards(RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async getData(pid: string): Promise<any> {
    this.logger.log({ pid }, 'GET /log')

    return
  }

  @Post('/')
  async log(@Body() logDTO: PageviewsDTO): Promise<any> {
    this.logger.log({ logDTO }, 'POST /log')
    await this.analyticsService.validate(logDTO)

    try {
      await this.analyticsService.create(logDTO)
      return
    } catch(e) {
      this.logger.log(e)
      throw new InternalServerErrorException(`Error error while saving the data: ${e}`)
    }
  }
}
