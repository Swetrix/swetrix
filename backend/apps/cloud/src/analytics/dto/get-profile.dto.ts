import { ApiProperty, PickType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  IsInt,
  Min,
  Max,
} from 'class-validator'
import { DEFAULT_TIMEZONE } from '../../user/entities/user.entity'
import { PID_REGEX } from '../../common/constants'
import { ValidatePeriod } from '../decorators/validate-period.decorator'
import { GetDataDto } from './getData.dto'

export class GetProfileDto {
  @ApiProperty({
    example: 'aUn1quEid-3',
    required: true,
    description: 'The project ID',
  })
  @IsNotEmpty()
  @Matches(PID_REGEX, { message: 'The provided Project ID (pid) is incorrect' })
  pid: string

  @ApiProperty({
    required: true,
    description: 'The profile ID',
    maxLength: 256,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(256)
  profileId: string

  @ApiProperty({
    description: 'Timezone to display data in',
    default: DEFAULT_TIMEZONE,
  })
  @IsOptional()
  timezone?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidatePeriod()
  period?: string

  @ApiProperty({ required: false })
  from?: string

  @ApiProperty({ required: false })
  to?: string
}

export class GetProfileSessionsDto extends PickType(GetDataDto, [
  'pid',
  'period',
  'from',
  'to',
  'filters',
  'timezone',
] as const) {
  @ApiProperty({
    required: true,
    description: 'The profile ID',
    maxLength: 256,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(256)
  profileId: string

  @ApiProperty({ required: false, default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(150)
  take?: number

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number
}
