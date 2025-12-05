import { PickType, ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { GetDataDto } from './getData.dto'

export class GetErrorsDto extends PickType(GetDataDto, [
  'pid',
  'period',
  'from',
  'to',
  'filters',
  'timezone',
] as const) {
  @Type(() => Number)
  take: number

  @Type(() => Number)
  skip: number

  @ApiProperty({
    example: {
      showResolved: true,
    },
    description: 'Errors list options',
  })
  options?: string
}
