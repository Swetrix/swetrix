import { ApiProperty } from '@nestjs/swagger'
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  Length,
  Matches,
} from 'class-validator'
import { PID_REGEX } from '../../common/constants'

export const DATA_DELETION_EVENT_TYPES = [
  'pageview',
  'custom_event',
  'error',
  'performance',
  'captcha',
] as const

export type DataDeletionEventType = (typeof DATA_DELETION_EVENT_TYPES)[number]

export class DataDeletionDto {
  @ApiProperty({
    example: 'aUn1quEid-3',
    required: true,
    description: 'The project ID',
  })
  @IsNotEmpty()
  @Matches(PID_REGEX, { message: 'The provided Project ID (pid) is incorrect' })
  pid: string

  @ApiProperty({
    required: false,
    description:
      'JSON-encoded array of filters, identical to the dashboard filter format. ' +
      'Example: [{"column":"cc","filter":"BG","isExclusive":false}]',
  })
  @IsOptional()
  @IsString()
  filters?: string

  @ApiProperty({
    required: false,
    description: 'Start of the date range (inclusive). YYYY-MM-DD.',
  })
  @IsOptional()
  @IsDateString()
  @Length(10, 10)
  from?: string

  @ApiProperty({
    required: false,
    description: 'End of the date range (inclusive). YYYY-MM-DD.',
  })
  @IsOptional()
  @IsDateString()
  @Length(10, 10)
  to?: string

  @ApiProperty({
    required: false,
    type: [String],
    enum: DATA_DELETION_EVENT_TYPES,
    description:
      "Event types to delete. Any of: 'pageview', 'custom_event', 'error', 'performance', 'captcha'.",
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(DATA_DELETION_EVENT_TYPES as unknown as string[], { each: true })
  types?: DataDeletionEventType[]
}
