import {
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
  IsUrl,
  IsNumber,
  IsArray,
} from 'class-validator'

import { ApiProperty } from '@nestjs/swagger'
import { HttpStatusCodeEnum, HttpOptions } from './create-monitor.dto'

export class UpdateMonitorHttpRequestDTO {
  @ApiProperty()
  @IsEnum(['HTTP', 'HTTPS'])
  type: 'HTTP' | 'HTTPS'

  @ApiProperty()
  @IsString()
  name: string

  @ApiProperty()
  @IsUrl()
  url: string

  @ApiProperty()
  @IsNumber()
  interval: number

  @ApiProperty()
  @IsNumber()
  retries: number

  @ApiProperty()
  @IsNumber()
  retryInterval: number

  @ApiProperty()
  @IsNumber()
  timeout: number

  @ApiProperty()
  @IsArray()
  @IsEnum(HttpStatusCodeEnum, { each: true })
  acceptedStatusCodes: HttpStatusCodeEnum[]

  @ApiProperty()
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty()
  @ValidateNested()
  httpOptions: HttpOptions
}
