import * as _keys from 'lodash/keys'
import * as _values from 'lodash/values'
import { ApiProperty } from '@nestjs/swagger'
import {
  IsNotEmpty,
  IsOptional,
  IsObject,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
} from 'class-validator'

const MAX_METADATA_KEYS = 20
const MAX_METADATA_VALUE_LENGTH = 1000

@ValidatorConstraint()
class MetadataSizeLimit implements ValidatorConstraintInterface {
  validate(metadata: Record<string, string>) {
    const values = _values(metadata)
    let totalSize = 0

    for (const value of values) {
      totalSize += value.length
      if (totalSize > MAX_METADATA_VALUE_LENGTH) {
        return false
      }
    }

    return true
  }
}

@ValidatorConstraint()
class MetadataKeysQuantity implements ValidatorConstraintInterface {
  validate(metadata: Record<string, string>) {
    return _keys(metadata).length <= MAX_METADATA_KEYS
  }
}

export class EventsDTO {
  @ApiProperty({
    example: 'aUn1quEid-3',
    required: true,
    description: 'The project ID',
  })
  @IsNotEmpty()
  pid: string

  @ApiProperty({
    example: 'user-subscribed',
    description: 'Event name',
    maxLength: 64,
  })
  @IsNotEmpty()
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
  @Validate(MetadataSizeLimit, {
    message: `Metadata object can't have values with total length more than ${MAX_METADATA_VALUE_LENGTH} characters`,
  })
  meta?: Record<string, string>
}
