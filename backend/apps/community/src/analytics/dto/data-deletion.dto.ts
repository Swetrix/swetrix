import { ApiProperty } from '@nestjs/swagger'
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  Matches,
} from 'class-validator'
import { PID_REGEX } from '../../common/constants'

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

  @ApiProperty({
    required: false,
    type: [String],
    description:
      "Event types to delete. Any of: 'pageview', 'custom_event', 'error', 'performance', 'captcha'.",
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  types?: string[]
}
