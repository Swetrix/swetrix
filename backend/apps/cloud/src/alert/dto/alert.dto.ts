import { ApiProperty, PartialType } from '@nestjs/swagger'
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  Length,
  IsBoolean,
  IsString,
  IsNumber,
} from 'class-validator'

export enum QueryMetric {
  PAGE_VIEWS = 'page_views',
  UNIQUE_PAGE_VIEWS = 'unique_page_views',
  ONLINE_USERS = 'online_users',
  CUSTOM_EVENTS = 'custom_events',
  ERRORS = 'errors',
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

class AlertBaseDTO {
  @ApiProperty()
  @IsNotEmpty()
  @Length(1, 50)
  name: string

  @ApiProperty({ enum: QueryMetric })
  @IsNotEmpty()
  @IsEnum(QueryMetric)
  queryMetric: QueryMetric

  @ApiProperty({ enum: QueryCondition, nullable: true })
  @IsEnum(QueryCondition)
  @IsOptional()
  queryCondition: QueryCondition | null

  @ApiProperty({ nullable: true })
  @IsNumber()
  @IsOptional()
  queryValue: number | null

  @ApiProperty({ enum: QueryTime, nullable: true })
  @IsEnum(QueryTime)
  @IsOptional()
  queryTime: QueryTime | null

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  active?: boolean

  @ApiProperty()
  @IsString()
  @IsOptional()
  queryCustomEvent?: string

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  alertOnNewErrorsOnly?: boolean

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  alertOnEveryCustomEvent?: boolean
}

export class CreateAlertDTO extends AlertBaseDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  pid: string
}

export class AlertDTO extends PartialType(AlertBaseDTO) {}
