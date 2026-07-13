import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator'

import { PID_REGEX } from '../../common/constants'
import { DEFAULT_TIMEZONE } from '../../user/entities/user.entity'
import { ValidatePeriod } from '../decorators/validate-period.decorator'

export class GetJourneySessionsDto {
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
    description: 'A stringified filters array',
    required: false,
  })
  @IsOptional()
  filters?: string

  @ApiProperty({
    description: 'Journey step the page was visited at (1-indexed)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  step: number

  @ApiProperty({
    description: 'The page visited at the given journey step',
  })
  @IsNotEmpty()
  @IsString()
  page: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(150)
  take?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number
}
