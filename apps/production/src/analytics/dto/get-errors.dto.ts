import { PickType, ApiProperty } from '@nestjs/swagger'
import { AnalyticsGET_DTO } from './getData.dto'

export class GetErrorsDto extends PickType(AnalyticsGET_DTO, [
  'pid',
  'period',
  'from',
  'to',
  'filters',
  'timezone',
] as const) {
  take: number

  skip: number

  @ApiProperty({
    example: {
      showResolved: true,
    },
    description: 'Errors list options',
  })
  options?: {
    showResolved: boolean
  }
}
