import { PickType, ApiProperty } from '@nestjs/swagger'
import { GetDataDto } from './getData.dto'

export interface GetErrorOverviewOptions {
  showResolved?: boolean
}

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
    required: false,
  })
  options?: GetErrorOverviewOptions
}
