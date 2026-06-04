import { ApiProperty, PickType } from '@nestjs/swagger'
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator'
import { Type } from 'class-transformer'

import { PID_REGEX } from '../../common/constants'
import { GetDataDto } from './getData.dto'

const SESSION_REPLAY_PRIVACY_MODES = ['total', 'normal', 'free-love'] as const

export type SessionReplayPrivacyMode =
  (typeof SESSION_REPLAY_PRIVACY_MODES)[number]

export class SessionReplayStartDto {
  @ApiProperty({ required: true, description: 'The project ID' })
  @IsNotEmpty()
  @Matches(PID_REGEX, { message: 'The provided Project ID (pid) is incorrect' })
  pid: string

  @ApiProperty({ required: true })
  @IsString()
  @MaxLength(80)
  replayId: string

  @ApiProperty({ enum: SESSION_REPLAY_PRIVACY_MODES, default: 'normal' })
  @IsIn(SESSION_REPLAY_PRIVACY_MODES)
  privacy: SessionReplayPrivacyMode

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  pg?: string

  @IsOptional()
  @IsString()
  @MaxLength(64)
  lc?: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  tz?: string

  @IsOptional()
  @IsString()
  @MaxLength(256)
  profileId?: string
}

export class SessionReplayChunkDto extends SessionReplayStartDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  chunkIndex: number

  @IsArray()
  @ArrayMaxSize(1000)
  @IsObject({ each: true })
  events: Record<string, unknown>[]
}

export class GetSessionReplayDto {
  @ApiProperty({ required: true, description: 'The project ID' })
  @IsNotEmpty()
  @Matches(PID_REGEX, { message: 'The provided Project ID (pid) is incorrect' })
  pid: string

  @ApiProperty()
  @IsNotEmpty()
  psid: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  replayId?: string
}

export class GetSessionReplaysDto extends PickType(GetDataDto, [
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
  @Max(150)
  take: number

  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip: number
}

export class SessionReplayExportStartDto extends GetSessionReplayDto {}
