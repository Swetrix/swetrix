import { PickType, ApiProperty } from '@nestjs/swagger'
import { GetDataDto } from './getData.dto'

export class GetErrorsDto extends PickType(GetDataDto, [
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
  options?: string
}
