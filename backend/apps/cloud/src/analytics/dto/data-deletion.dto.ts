import { ApiProperty } from '@nestjs/swagger'
import {
  ArrayNotEmpty,
  IsIn,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator'
import { PID_REGEX } from '../../common/constants'

export const DATA_DELETION_EVENT_TYPES = [
  'pageview',
  'custom_event',
  'error',
  'performance',
  'captcha',
  // Session replays live in a separate table (session_replay_chunks) + object
  // storage rather than the `events` table; deletion is handled specially.
  'session_replay',
] as const

export type DataDeletionEventType = (typeof DATA_DELETION_EVENT_TYPES)[number]

export class DataDeletionPreviewDto {
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
    description:
      'Start of the date range (inclusive). ISO string or YYYY-MM-DD.',
  })
  @IsOptional()
  @IsString()
  from?: string

  @ApiProperty({
    required: false,
    description: 'End of the date range (inclusive). ISO string or YYYY-MM-DD.',
  })
  @IsOptional()
  @IsString()
  to?: string
}

export class DataDeletionDto extends DataDeletionPreviewDto {
  @ApiProperty({
    required: true,
    type: [String],
    enum: DATA_DELETION_EVENT_TYPES,
    description:
      "Event types to delete. Any of: 'pageview', 'custom_event', 'error', 'performance', 'captcha', 'session_replay'.",
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsIn(DATA_DELETION_EVENT_TYPES as unknown as string[], { each: true })
  types: DataDeletionEventType[]
}
