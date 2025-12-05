import { ApiProperty, PickType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsOptional, IsIn, IsInt, Min } from 'class-validator'
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
  @Type(() => Number)
  @IsInt()
  @Min(0)
  take?: number

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number

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
