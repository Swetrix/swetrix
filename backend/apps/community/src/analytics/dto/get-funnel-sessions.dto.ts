import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator'

import { PID_REGEX } from '../../common/constants'
import { DEFAULT_TIMEZONE } from '../../user/entities/user.entity'
import { ValidatePeriod } from '../decorators/validate-period.decorator'

export class GetFunnelSessionsDto {
  @ApiProperty({
    example: 'aUn1quEid-3',
    required: true,
    description: 'The project ID',
  })
  @IsNotEmpty()
  @Matches(PID_REGEX, { message: 'The provided Project ID (pid) is incorrect' })
  pid: string

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidatePeriod()
  period?: string

  @ApiProperty({ required: false })
  from: string

  @ApiProperty({ required: false })
  to: string

  @ApiProperty({
    description: 'Timezone to display data in',
    default: DEFAULT_TIMEZONE,
  })
  timezone: string

  @ApiProperty({
    description: 'A stringified array of pages/events for the funnel',
    required: false,
  })
  pages?: string

  @ApiProperty({
    description: 'Funnel ID (alternative to pages)',
    required: false,
  })
  funnelId?: string

  @ApiProperty({
    description: 'Funnel step to get sessions for (1-indexed)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  step: number

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(150)
  take: number

  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip: number
}
