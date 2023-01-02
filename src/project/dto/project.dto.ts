import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty } from 'class-validator'

export enum QueryMetric {
  PAGE_VIEWS = 'page_views',
  UNIQUE_PAGE_VIEWS = 'unique_page_views',
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

export class ProjectDTO {
  @ApiProperty({
    example: 'Your awesome project',
    required: true,
    description: 'A display name for your project',
  })
  @IsNotEmpty()
  name: string

  @ApiProperty({
    example: 'aUn1quEid-3',
    required: true,
    description: 'A unique project ID',
  })
  @IsNotEmpty()
  id: string

  @ApiProperty({
    example: 'localhost:3000,example.com',
    required: false,
    description: 'An array allowed origins',
  })
  origins: string[] | null

  @ApiProperty({
    example: '::1,127.0.0.1,192.168.0.1/32',
    required: false,
    description: 'Array of blocked IP addresses',
  })
  ipBlacklist: string[] | null

  @ApiProperty({
    required: false,
    description:
      "The project's state. If enabled - all the incoming analytics data will be saved.",
  })
  active: boolean

  @ApiProperty({
    required: false,
    description:
      "When true, anyone on the internet (including Google) would be able to see the project's Dashboard.",
  })
  public: boolean

  @ApiProperty({
    required: false,
    description:
      'Alert if the number of online users exceeds the specified number.',
  })
  alertIfOnlineUsersExceeds: number | null

  @ApiProperty()
  additionalAlertQueryMetric: QueryMetric | null

  @ApiProperty()
  additionalAlertQueryCondition: QueryCondition | null

  @ApiProperty()
  additionalAlertQueryValue: number | null

  @ApiProperty()
  additionalAlertQueryTime: QueryTime | null
}
