import * as _isEmpty from 'lodash/isEmpty'
import * as _last from 'lodash/last'
import * as moment from 'moment'
import { Controller, Body, Query, Param, UseGuards, Get, Post, Put, Delete, BadRequestException, 
  HttpCode, NotFoundException, InternalServerErrorException } from '@nestjs/common'
import { ApiTags, ApiQuery, ApiResponse } from '@nestjs/swagger'
import { Between } from 'typeorm'

import { AnalyticsService } from './analytics.service'
import { ProjectService } from '../project/project.service'
import { UserType } from '../user/entities/user.entity'
import { Pagination } from '../common/pagination/pagination'
import { Analytics } from './entities/analytics.entity'
import { UserService } from '../user/user.service'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from 'src/common/guards/roles.guard'
import { PageviewsDTO } from './dto/pageviews.dto'
import { AnalyticsGET_DTO } from './dto/getData.dto'
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
  // @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async getData(@Query() data: AnalyticsGET_DTO): Promise<any> {
    this.logger.log({ ...data }, 'GET /log')
    const { pid, period, timeBucket, from, to } = data
    // TODO: data validation
    // TODO: automatic timeBucket detection based on period provided
    const where = Object({ pid })
    
    if (!_isEmpty(from) && !_isEmpty(to)) {
      if (moment.utc(from).isAfter(moment.utc(to), 'second')) {
        throw new BadRequestException('The timeframe \'from\' parameter cannot be greater than \'to\'')
      }

      if (moment.utc(to).isAfter(moment.utc(), 'second')) {
        where.created = Between(from, moment.utc().format('YYYY-MM-DD HH:mm:ss'))
      } else {
        where.created = Between(from, to)
      }
    } else if (!_isEmpty(period)) {
      where.created = Between(moment.utc().subtract(parseInt(period), _last(period)).format('YYYY-MM-DD HH:mm:ss'), moment.utc().format('YYYY-MM-DD HH:mm:ss'))
    } else {
      throw new BadRequestException('The timeframe (either from/to pair or period) to be provided')
    }

    // const project = await this.projectService.findOne(pid)
    // if (_isEmpty(project)) throw new BadRequestException('The provided Project ID (pid) is incorrect')

    const response = await this.analyticsService.findWhere(where)
    const [groupFrom, groupTo] = where.created._value
    const result = await this.analyticsService.groupByTimeBucket(response, timeBucket, groupFrom, groupTo)
    return result
  }

  @Post('/')
  async log(@Body() logDTO: PageviewsDTO): Promise<any> {
    this.logger.log({ logDTO }, 'POST /log')
    await this.analyticsService.validate(logDTO)
    const dto = {
      ...logDTO,
      created: moment.utc().format('YYYY-MM-DD HH:mm:ss'),
    }

    try {
      await this.analyticsService.create(dto)
      return
    } catch(e) {
      this.logger.log(e)
      throw new InternalServerErrorException(`Error error while saving the data: ${e}`)
    }
  }
}
