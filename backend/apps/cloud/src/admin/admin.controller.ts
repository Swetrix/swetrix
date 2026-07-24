import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common'
import { ApiExcludeController } from '@nestjs/swagger'

import { PlanType } from '../user/entities/user.entity'
import {
  AdminService,
  FeedbackType,
  ProjectsFilter,
  UsersFilter,
} from './admin.service'
import { AdminAuth } from './decorators/admin-auth.decorator'

const USERS_FILTERS: UsersFilter[] = [
  'all',
  'active',
  'inactive',
  'paid',
  'trial',
  'free',
  'cancelling',
  'suspended',
  'blocked',
]

const PROJECTS_FILTERS: ProjectsFilter[] = [
  'all',
  'active',
  'archived',
  'inactive-30',
  'inactive-60',
  'inactive-90',
]

const CHART_DAYS = [30, 90, 180, 365]
const TOP_PROJECTS_DAYS = [1, 7, 30]

const parsePage = (page?: string): number => {
  const parsed = Number(page)

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100000) {
    return 0
  }

  return parsed
}

const parseSearch = (search?: string): string =>
  (search || '').trim().slice(0, 100)

const parseOneOf = <T>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T => (allowed.includes(value as T) ? (value as T) : fallback)

const parseDays = (
  value: string | undefined,
  allowed: readonly number[],
  fallback: number,
): number => {
  const parsed = Number(value)

  return allowed.includes(parsed) ? parsed : fallback
}

const parseOverrides = (
  value: unknown,
  field: string,
): Record<string, unknown> | null => {
  if (value === null) {
    return null
  }

  if (
    typeof value !== 'object' ||
    Array.isArray(value) ||
    JSON.stringify(value).length > 5000
  ) {
    throw new BadRequestException(
      `${field} must be a small JSON object or null`,
    )
  }

  return value as Record<string, unknown>
}

@ApiExcludeController()
@AdminAuth()
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Used by the frontend loader to decide whether /admin exists for this user
  @Get('access')
  async getAccess() {
    return { granted: true }
  }

  @Get('overview')
  async getOverview() {
    return this.adminService.getOverview()
  }

  @Get('revenue')
  async getRevenue() {
    return this.adminService.getRevenue()
  }

  @Get('billing')
  async getBilling() {
    return this.adminService.getBilling()
  }

  @Get('bot-blocks')
  async getBotBlocks(@Query('days') days?: string) {
    return this.adminService.getBotBlocks(parseDays(days, [7, 30, 90], 7))
  }

  @Get('charts')
  async getCharts(@Query('days') days?: string) {
    return this.adminService.getCharts(parseDays(days, CHART_DAYS, 30))
  }

  @Get('users')
  async getUsers(
    @Query('page') page?: string,
    @Query('search') search?: string,
    @Query('filter') filter?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: string,
  ) {
    return this.adminService.getUsers(
      parsePage(page),
      parseSearch(search),
      parseOneOf(filter, USERS_FILTERS, 'all'),
      parseOneOf(sortBy, ['created', 'email', 'planCode'] as const, 'created'),
      parseOneOf(order, ['ASC', 'DESC'] as const, 'DESC'),
    )
  }

  @Get('users/:id')
  async getUserDetails(@Param('id') id: string) {
    return this.adminService.getUserDetails(id)
  }

  @Patch('users/:id')
  async updateUser(
    @Param('id') id: string,
    @Body()
    body: {
      planType?: PlanType | null
      addonOverrides?: Record<string, unknown> | null
      entitlementOverrides?: Record<string, unknown> | null
    },
  ) {
    const updates: Parameters<AdminService['updateUser']>[1] = {}

    if ('planType' in body) {
      if (
        body.planType !== null &&
        !Object.values(PlanType).includes(body.planType)
      ) {
        throw new BadRequestException('Invalid planType')
      }

      updates.planType = body.planType
    }

    if ('addonOverrides' in body) {
      updates.addonOverrides = parseOverrides(
        body.addonOverrides,
        'addonOverrides',
      )
    }

    if ('entitlementOverrides' in body) {
      updates.entitlementOverrides = parseOverrides(
        body.entitlementOverrides,
        'entitlementOverrides',
      )
    }

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException('Nothing to update')
    }

    return this.adminService.updateUser(id, updates)
  }

  @Get('projects')
  async getProjects(
    @Query('page') page?: string,
    @Query('search') search?: string,
    @Query('filter') filter?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: string,
  ) {
    return this.adminService.getProjects(
      parsePage(page),
      parseSearch(search),
      parseOneOf(filter, PROJECTS_FILTERS, 'all'),
      parseOneOf(sortBy, ['created', 'name'] as const, 'created'),
      parseOneOf(order, ['ASC', 'DESC'] as const, 'DESC'),
    )
  }

  @Get('projects/top')
  async getTopProjects(@Query('days') days?: string) {
    return this.adminService.getTopProjects(
      parseDays(days, TOP_PROJECTS_DAYS, 7),
    )
  }

  @Get('projects/:id')
  async getProjectDetails(@Param('id') id: string) {
    return this.adminService.getProjectDetails(id)
  }

  @Get('organisations')
  async getOrganisations(
    @Query('page') page?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: string,
  ) {
    return this.adminService.getOrganisations(
      parsePage(page),
      parseSearch(search),
      parseOneOf(sortBy, ['created', 'name'] as const, 'created'),
      parseOneOf(order, ['ASC', 'DESC'] as const, 'DESC'),
    )
  }

  @Get('organisations/:id')
  async getOrganisationDetails(@Param('id') id: string) {
    return this.adminService.getOrganisationDetails(id)
  }

  @Get('feedback')
  async getFeedback(
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('search') search?: string,
    @Query('order') order?: string,
  ) {
    return this.adminService.getFeedback(
      parseOneOf(
        type,
        ['user', 'cancellation', 'deletion'] as FeedbackType[],
        'user',
      ),
      parsePage(page),
      parseSearch(search),
      parseOneOf(order, ['ASC', 'DESC'] as const, 'DESC'),
    )
  }

  @Get('database')
  async getDatabaseInfo() {
    return this.adminService.getDatabaseInfo()
  }
}
