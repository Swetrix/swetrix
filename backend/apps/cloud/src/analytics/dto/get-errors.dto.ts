import { PickType, ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, Min } from 'class-validator'
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
  @IsInt()
  @Min(0)
  take: number

  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip: number

  @ApiProperty({
    example: {
      showResolved: true,
    },
    description: 'Errors list options',
  })
  options?: string
}
