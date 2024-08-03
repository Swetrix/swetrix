import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsNotEmpty } from 'class-validator'

export enum TimeFrameQueryEnum {
  NEXT_1_HOUR = 'next_1_hour',
  NEXT_4_HOUR = 'next_4_hour',
  NEXT_8_HOUR = 'next_8_hour',
  NEXT_12_HOUR = 'next_12_hour',
  NEXT_24_HOUR = 'next_24_hour',
  NEXT_72_HOUR = 'next_72_hour',
  NEXT_168_HOUR = 'next_168_hour',
}

export class TimeFrameQueryEnumDTO {
  @ApiProperty({
    example: 'next_8_hour',
    required: true,
    description: 'The timeframe of prediction',
    enum: TimeFrameQueryEnum,
  })
  @IsNotEmpty()
  @IsEnum(TimeFrameQueryEnum)
  timeframe: TimeFrameQueryEnum
}
