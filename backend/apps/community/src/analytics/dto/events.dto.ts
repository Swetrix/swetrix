import _keys from 'lodash/keys'
import _values from 'lodash/values'
import _some from 'lodash/some'
import { ApiProperty } from '@nestjs/swagger'
import {
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsString,
  MaxLength,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
  Matches,
} from 'class-validator'
import { Transform } from 'class-transformer'
import { PID_REGEX } from '../../common/constants'

export const MAX_METADATA_KEYS = 100
export const MAX_METADATA_VALUE_LENGTH = 2000

@ValidatorConstraint()
export class MetadataSizeLimit implements ValidatorConstraintInterface {
  validate(metadata: Record<string, string>) {
    const keys = _keys(metadata)
    const values = _values(metadata)
    let totalSize = 0

    for (let i = 0; i < keys.length; i++) {
      totalSize +=
        keys[i].length +
        (values[i] && typeof values[i] === 'string' ? values[i].length : 0)
      if (totalSize > MAX_METADATA_VALUE_LENGTH) {
        return false
      }
    }

    return true
  }
}

@ValidatorConstraint()
export class MetadataKeysQuantity implements ValidatorConstraintInterface {
  validate(metadata: Record<string, string>) {
    return _keys(metadata).length <= MAX_METADATA_KEYS
  }
}

export function transformMetadataJsonPrimitivesToString(value: any): any {
  if (!value || typeof value !== 'object') {
    return value
  }

  const transformed = { ...value }

  for (const key in transformed) {
    const val = transformed[key]

    // Convert numbers, booleans, and null to strings
    if (typeof val === 'number') {
      transformed[key] = String(val)
    } else if (typeof val === 'boolean') {
      transformed[key] = String(val)
    } else if (val === null) {
      transformed[key] = 'null'
    }
    // Leave objects, arrays, and other types unchanged for later validation to catch
  }

  return transformed
}

@ValidatorConstraint()
export class MetadataValueType implements ValidatorConstraintInterface {
  validate(metadata: Record<string, string>) {
    const values = _values(metadata)

    return !_some(values, value => typeof value !== 'string')
  }
}

export class EventsDto {
  @ApiProperty({
    example: 'aUn1quEid-3',
    required: true,
    description: 'The project ID',
  })
  @IsNotEmpty()
  @Matches(PID_REGEX, { message: 'The provided Project ID (pid) is incorrect' })
  pid: string

  @ApiProperty({
    example: 'user_12345',
    description:
      'Optional profile ID for long-term user tracking. If not provided, one will be auto-generated.',
    maxLength: 256,
  })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  profileId?: string

  @ApiProperty({
    example: 'user-subscribed',
    description: 'Event name',
    maxLength: 64,
  })
  @IsNotEmpty()
  // Smaller than 64 characters, must start with an English letter and contain only letters (a-z A-Z), numbers (0-9), underscores (_) and dots (.)
  @Matches(/^[a-zA-Z][\w.]{0,62}$/, {
    message:
      'Event name must start with an English letter and contain only letters (a-z A-Z), numbers (0-9), underscores (_) and dots (.). Maximum length is 63 characters.',
  })
  ev: string

  @ApiProperty({
    description:
      'If true, only 1 event with the same ID will be saved per user session',
  })
  unique: boolean

  // Tracking metrics
  @ApiProperty({
    example: 'Europe/Kiev',
    description: "User's timezone",
  })
  tz?: string

  @ApiProperty({
    example: '/articles/my-awesome-article-1',
    description: 'A page that user sent data from',
  })
  pg?: string

  @ApiProperty({
    example: 'en-GB',
    description: "User's locale",
  })
  lc?: string

  @ApiProperty({
    example: 'https://example.com',
    description: 'The referrer',
  })
  ref?: string

  @ApiProperty({
    example: 'duckduckgo',
    description: 'utm_source URL parameter',
  })
  so?: string

  @ApiProperty({
    example: 'cpc',
    description: 'utm_medium URL parameter',
  })
  me?: string

  @ApiProperty({
    example: 'spring_sale',
    description: 'utm_campaign URL parameter',
  })
  ca?: string

  @ApiProperty({
    example: 'running+shoes',
    description: 'utm_term URL parameter',
  })
  te?: string

  @ApiProperty({
    example: 'logolink',
    description: 'utm_content URL parameter',
  })
  co?: string

  @ApiProperty({
    example: {
      affiliate: 'Yes',
      protocol: 'HTTPS',
    },
    description: 'Event-related metadata object with string values',
  })
  @IsOptional()
  @IsObject()
  @Validate(MetadataKeysQuantity, {
    message: `Metadata object can't have more than ${MAX_METADATA_KEYS} keys`,
  })
  @Transform(({ value }) => transformMetadataJsonPrimitivesToString(value))
  @Validate(MetadataValueType, {
    message: 'All of metadata object values must be primitive JSON values',
  })
  @Validate(MetadataSizeLimit, {
    message: `Metadata object can't have keys and values with total length more than ${MAX_METADATA_VALUE_LENGTH} characters`,
  })
  meta?: Record<string, string>
}
