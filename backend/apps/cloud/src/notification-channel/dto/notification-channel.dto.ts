import { ApiProperty } from '@nestjs/swagger'
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  IsObject,
  IsUUID,
  Matches,
} from 'class-validator'
import { PID_REGEX } from '../../common/constants'
import { NotificationChannelType } from '../entity/notification-channel.entity'

export class CreateChannelDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string

  @ApiProperty({ enum: NotificationChannelType })
  @IsEnum(NotificationChannelType)
  type: NotificationChannelType

  // Discriminated config bag, validated per type at the service layer to keep the DTO simple.
  @ApiProperty()
  @IsObject()
  config: Record<string, unknown>

  // Exactly one of the three scope fields must be provided.
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID('4')
  organisationId?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @Matches(PID_REGEX, {
    message: 'The provided Project ID (projectId) is incorrect',
  })
  projectId?: string

  // userId omitted: user-scoped channels are owned by the authenticated caller.
  @ApiProperty({ required: false, default: false })
  @IsOptional()
  userScoped?: boolean
}

export class UpdateChannelDTO {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>
}

export class WebpushSubscribeDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  endpoint: string

  @ApiProperty()
  @IsObject()
  keys: { p256dh: string; auth: string }

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  userAgent?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string
}
