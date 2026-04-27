import { ApiProperty } from '@nestjs/swagger'
import { IsIn, IsOptional, IsString, Matches } from 'class-validator'

import { PID_REGEX } from '../../common/constants'

const BOT_STATS_PERIODS = ['7d', '30d', '90d'] as const
type BotStatsPeriod = (typeof BOT_STATS_PERIODS)[number]

export class GetBotStatsDto {
  @ApiProperty({ description: 'Project ID', required: true })
  @IsString()
  @Matches(PID_REGEX, { message: 'The provided Project ID (pid) is incorrect' })
  pid: string

  @ApiProperty({
    description: 'Time window for the report',
    required: false,
    enum: BOT_STATS_PERIODS,
    default: '30d',
  })
  @IsOptional()
  @IsIn(BOT_STATS_PERIODS as unknown as string[])
  period?: BotStatsPeriod = '30d'
}
