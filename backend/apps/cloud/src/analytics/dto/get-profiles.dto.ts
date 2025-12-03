import { ApiProperty, PickType } from '@nestjs/swagger'
import { IsOptional, IsIn } from 'class-validator'
import { GetDataDto } from './getData.dto'

export class GetProfilesDto extends PickType(GetDataDto, [
  'pid',
  'period',
  'from',
  'to',
  'filters',
  'timezone',
] as const) {
  @ApiProperty({ required: false, default: 30 })
  @IsOptional()
  take?: number

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  skip?: number

  @ApiProperty({
    required: false,
    description: 'Search by profileId or display name',
  })
  @IsOptional()
  search?: string

  @ApiProperty({
    required: false,
    description: 'Filter by profile type',
    enum: ['all', 'anonymous', 'identified'],
    default: 'all',
  })
  @IsOptional()
  @IsIn(['all', 'anonymous', 'identified'])
  profileType?: 'all' | 'anonymous' | 'identified'
}
