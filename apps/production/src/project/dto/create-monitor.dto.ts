import {
  IsEnum,
  IsString,
  IsUrl,
  IsNumber,
  IsArray,
  ValidateNested,
  IsOptional,
  IsObject,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

// Enums for HTTP Methods and Status Codes
export enum HttpMethodEnum {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
}

export enum HttpStatusCodeEnum {
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,
  MOVED_PERMANENTLY = 301,
  FOUND = 302,
  NOT_MODIFIED = 304,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
  NOT_IMPLEMENTED = 501,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
}

export enum HttpType {
  HTTP = 'HTTP',
  HTTPS = 'HTTPS',
}

// DTO for HTTP Options
export class HttpOptions {
  @IsArray()
  @IsEnum(HttpMethodEnum, { each: true })
  method: HttpMethodEnum[]

  @IsOptional()
  @IsObject()
  body?: Record<string, unknown>

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>
}

// Main DTO for Monitor Request
export class CreateMonitorHttpRequestDTO {
  @ApiProperty()
  @IsEnum(HttpType)
  type: HttpType

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
  @IsString()
  groupName: string

  @ApiProperty()
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty()
  @ValidateNested()
  @Type(() => HttpOptions)
  httpOptions: HttpOptions
}
