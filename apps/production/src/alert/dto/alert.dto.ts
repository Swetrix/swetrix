import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, Length } from 'class-validator'

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
  @IsNotEmpty()
  @Length(1, 50)
  name?: string

  @ApiProperty()
  @IsOptional()
  queryMetric?: QueryMetric

  @ApiProperty()
  @IsOptional()
  queryCondition?: QueryCondition

  @ApiProperty()
  @IsOptional()
  queryValue?: number

  @ApiProperty()
  @IsOptional()
  queryTime?: QueryTime

  @ApiProperty()
  @IsOptional()
  active?: boolean
}

export class CreateAlertDTO {
  @ApiProperty()
  @IsNotEmpty()
  pid: string

  @ApiProperty()
  @IsNotEmpty()
  @Length(1, 50)
  name: string

  @ApiProperty()
  @IsNotEmpty()
  queryMetric: QueryMetric

  @ApiProperty()
  @IsNotEmpty()
  queryCondition: QueryCondition

  @ApiProperty()
  @IsNotEmpty()
  queryValue: number

  @ApiProperty()
  @IsNotEmpty()
  queryTime: QueryTime

  @ApiProperty()
  @IsNotEmpty()
  active: boolean
}
