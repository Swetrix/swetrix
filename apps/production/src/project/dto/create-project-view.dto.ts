import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  IsLocale,
  IsISO31661Alpha2,
  ValidateNested,
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { ProjectViewType } from '../entity/project-view.entity'
import { ProjectViewCustomEventMetaValueType } from '../entity/project-view-custom-event.entity'

export enum OperatingSystem {
  Windows = 'Windows',
  MacOS = 'Mac OS',
  Android = 'Android',
  iOS = 'iOS',
  Linux = 'Linux',
  Ubuntu = 'Ubuntu',
  ChromiumOS = 'Chromium OS',
  Fedora = 'Fedora',
  FreeBSD = 'FreeBSD',
  Tizen = 'Tizen',
}

export enum Browser {
  Chrome = 'Chrome',
  Firefox = 'Firefox',
  MobileSafari = 'Mobile Safari',
  Safari = 'Safari',
  SamsungBrowser = 'Samsung Browser',
}

export enum Device {
  Desktop = 'Desktop',
  Mobile = 'Mobile',
  Tablet = 'Tablet',
  Wearable = 'Wearable',
  SmartTV = 'Smarttv',
}

export class ProjectViewCustomEventDto {
  @ApiProperty()
  @MaxLength(100)
  @MinLength(1)
  @IsString()
  @IsNotEmpty()
  customEventName: string

  @ApiProperty()
  @MaxLength(100)
  @MinLength(1)
  @IsString()
  @IsNotEmpty()
  metaKey: string

  @ApiProperty()
  @MaxLength(100)
  @MinLength(1)
  @IsString()
  @IsNotEmpty()
  metaValue: string

  @ApiProperty({ enum: ProjectViewCustomEventMetaValueType })
  @IsEnum(ProjectViewCustomEventMetaValueType)
  @IsNotEmpty()
  metaValueType: ProjectViewCustomEventMetaValueType
}

export class CreateProjectViewDto {
  @ApiProperty()
  @MaxLength(100)
  @MinLength(1)
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiProperty({ description: 'Type of the view', enum: ProjectViewType })
  @IsEnum(ProjectViewType)
  @IsNotEmpty()
  type: ProjectViewType

  @ApiProperty({ description: 'Page the user viewed (/hello)', nullable: true })
  @Matches(/^\/[a-zA-Z0-9-_\/\[\]]*$/, { message: 'Invalid URL path format for pg' })
  @IsOptional()
  pg?: string

  @ApiProperty({ description: 'Name of the custom event (e.g., sign_up)' })
  @MaxLength(100)
  @MinLength(1)
  @IsString()
  @IsOptional()
  ev?: string

  @ApiProperty({
    description: 'User device (mobile, desktop, tablet, etc.)',
    nullable: true,
  })
  @IsEnum(Device)
  @IsOptional()
  dv?: string

  @ApiProperty({ description: 'Browser', nullable: true })
  @IsEnum(Browser)
  @IsOptional()
  br?: string

  @ApiProperty({ description: 'Operating system', nullable: true })
  @IsEnum(OperatingSystem)
  @IsOptional()
  os?: string

  @ApiProperty({ description: 'Locale (en-UK, en-US)', nullable: true })
  @IsLocale()
  @IsOptional()
  lc?: string

  @ApiProperty({
    description: 'Referrer (site from which the user came to the site using Swetrix)',
    nullable: true,
  })
  @Matches(/^(https?:\/\/)?([a-zA-Z0-9.-]+)(:[0-9]{1,5})?(\/.*)?$/, { message: 'Invalid referrer URL format' })
  @IsOptional()
  ref?: string;

  @ApiProperty({ description: 'UTM source', nullable: true })
  @MaxLength(100)
  @MinLength(1)
  @IsString()
  @IsOptional()
  so?: string

  @ApiProperty({ description: 'UTM medium', nullable: true })
  @MaxLength(100)
  @MinLength(1)
  @IsString()
  @IsOptional()
  me?: string

  @ApiProperty({ description: 'UTM campaign', nullable: true })
  @MaxLength(100)
  @MinLength(1)
  @IsString()
  @IsOptional()
  ca?: string

  @ApiProperty({ description: 'Country code', nullable: true })
  @IsISO31661Alpha2()
  @IsNotEmpty()
  cc: string

  @ApiProperty({ description: 'Region/state (Alabama, etc.)', nullable: true })
  @MaxLength(100)
  @MinLength(1)
  @IsString()
  @IsString()
  rg?: string

  @ApiProperty({ description: 'City (Berlin, London, etc.)', nullable: true })
  @MaxLength(100)
  @MinLength(1)
  @IsString()
  @IsString()
  ct?: string

  @ApiProperty({ type: ProjectViewCustomEventDto, isArray: true })
  @ValidateNested()
  @IsNotEmpty()
  customEvents: ProjectViewCustomEventDto[]
}
