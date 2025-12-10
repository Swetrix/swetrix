import { PickType, ApiProperty } from '@nestjs/swagger'
import { GetDataDto } from './getData.dto'

export class GetErrorOverviewDto extends PickType(GetDataDto, [
  'pid',
  'period',
  'from',
  'to',
  'filters',
  'timezone',
  'timeBucket',
] as const) {
  @ApiProperty({
    example: {
      showResolved: true,
    },
    description: 'Errors list options',
  })
  options?: string
}
