import { ApiProperty } from '@nestjs/swagger'
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  IsObject,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'
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
  @IsBoolean()
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

class WebpushKeysDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  p256dh: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  auth: string
}

export class WebpushSubscribeDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  endpoint: string

  @ApiProperty()
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => WebpushKeysDto)
  keys: WebpushKeysDto

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  userAgent?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string
}
