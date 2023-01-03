import { ApiProperty } from '@nestjs/swagger'

export enum QueryMetric {
  PAGE_VIEWS = 'page_views',
  UNIQUE_PAGE_VIEWS = 'unique_page_views',
  ONLINE_USERS = 'online_users',
}

export enum QueryCondition {
  GREATER_THAN = 'greater_than',
  GREATER_EQUAL_THAN = 'greater_equal_than',
  LESS_THAN = 'less_than',
  LESS_EQUAL_THAN = 'less_equal_than',
}

export enum QueryTime {
  LAST_15_MINUTES = 'last_15_minutes',
  LAST_30_MINUTES = 'last_30_minutes',
  LAST_1_HOUR = 'last_1_hour',
  LAST_4_HOURS = 'last_4_hours',
  LAST_24_HOURS = 'last_24_hours',
  LAST_48_HOURS = 'last_48_hours',
}

export class AlertDTO {
  @ApiProperty()
  queryMetric?: QueryMetric | null

  @ApiProperty()
  queryCondition?: QueryCondition | null

  @ApiProperty()
  queryValue?: number | null

  @ApiProperty()
  queryTime?: QueryTime | null

  @ApiProperty()
  active?: boolean
}

export class CreateAlertDTO {
  @ApiProperty()
  pid: string

  @ApiProperty()
  name: string

  @ApiProperty()
  queryMetric: QueryMetric | null

  @ApiProperty()
  queryCondition: QueryCondition | null

  @ApiProperty()
  queryValue: number | null

  @ApiProperty()
  queryTime: QueryTime | null
}
