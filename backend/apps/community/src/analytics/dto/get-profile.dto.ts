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
import { GetDataDto } from './getData.dto'
import { MAX_STORED_PROFILE_ID_LENGTH } from './identify.dto'

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
    maxLength: MAX_STORED_PROFILE_ID_LENGTH,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(MAX_STORED_PROFILE_ID_LENGTH)
  profileId: string

  @ApiProperty({
    description: 'Timezone to display data in',
    default: DEFAULT_TIMEZONE,
  })
  @IsOptional()
  timezone?: string
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
    maxLength: MAX_STORED_PROFILE_ID_LENGTH,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(MAX_STORED_PROFILE_ID_LENGTH)
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
