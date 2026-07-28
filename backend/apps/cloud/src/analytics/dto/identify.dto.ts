import _keys from 'lodash/keys'
import _some from 'lodash/some'
import _values from 'lodash/values'
import { ApiProperty } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator'
import { PID_REGEX } from '../../common/constants'

// The raw identifier a site passes to identify() (or as `profileId` on an
// event). It is stored as provided, behind the `usr_` prefix.
export const MAX_USER_PROFILE_ID_LENGTH = 256
export const MAX_STORED_PROFILE_ID_LENGTH =
  MAX_USER_PROFILE_ID_LENGTH + 'usr_'.length

const MAX_TRAITS_KEYS = 50
const MAX_TRAIT_KEY_LENGTH = 128
const MAX_TRAITS_TOTAL_LENGTH = 2000

@ValidatorConstraint()
class TraitsKeysQuantity implements ValidatorConstraintInterface {
  validate(traits: Record<string, string>) {
    return _keys(traits).length <= MAX_TRAITS_KEYS
  }
}

// Control / format characters never appear in a genuine trait name or value,
// but would corrupt the dashboard rendering them (e.g. via a right-to-left
// override).
const UNPRINTABLE_REGEX = /[\p{Cc}\p{Cf}]/u

@ValidatorConstraint()
class TraitsKeyFormat implements ValidatorConstraintInterface {
  validate(traits: Record<string, string>) {
    return !_some(
      _keys(traits),
      (key) =>
        !key.trim() ||
        key.length > MAX_TRAIT_KEY_LENGTH ||
        UNPRINTABLE_REGEX.test(key),
    )
  }
}

@ValidatorConstraint()
class TraitsValueType implements ValidatorConstraintInterface {
  validate(traits: Record<string, string>) {
    return !_some(
      _values(traits),
      (value) => typeof value !== 'string' || UNPRINTABLE_REGEX.test(value),
    )
  }
}

@ValidatorConstraint()
class TraitsSizeLimit implements ValidatorConstraintInterface {
  validate(traits: Record<string, string>) {
    let totalSize = 0

    for (const key of _keys(traits)) {
      const value = traits[key]
      totalSize += key.length + (typeof value === 'string' ? value.length : 0)

      if (totalSize > MAX_TRAITS_TOTAL_LENGTH) {
        return false
      }
    }

    return true
  }
}

/**
 * Traits are free-form, so accept the primitives a JSON payload naturally
 * carries and store them as strings. `null` / `undefined` mean "remove this
 * trait" and are normalised to an empty value.
 */
function transformTraits(value: any): any {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value
  }

  const transformed: Record<string, any> = {}

  for (const key of _keys(value)) {
    const trait = value[key]

    if (trait === null || trait === undefined) {
      transformed[key.trim()] = ''
    } else if (typeof trait === 'number' || typeof trait === 'boolean') {
      transformed[key.trim()] = String(trait)
    } else if (typeof trait === 'string') {
      transformed[key.trim()] = trait.trim()
    } else {
      // Objects and arrays are left as-is for the validation below to reject
      transformed[key.trim()] = trait
    }
  }

  return transformed
}

export class IdentifyDto {
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
    required: true,
    description:
      'A unique, stable identifier of the user (e.g. an internal user ID), stored as provided. The current anonymous profile of the visitor gets linked to the resulting identified profile.',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(MAX_USER_PROFILE_ID_LENGTH)
  profileId: string

  @ApiProperty({
    example: {
      email: 'john@example.com',
      plan: 'premium',
    },
    required: false,
    description:
      'Traits of the identified user, displayed on their profile. Values must be primitive JSON types and are stored as strings; a null value removes the trait.',
  })
  @IsOptional()
  @IsObject()
  // Pins the target type of the nested object. Without it class-transformer
  // guesses one from `value.constructor`, which a `{"constructor": "..."}`
  // trait turns into a string and blows up with a TypeError (a 500 on this
  // public endpoint) before any validation below runs.
  @Type(() => Object)
  @Transform(({ value }) => transformTraits(value))
  @Validate(TraitsKeysQuantity, {
    message: `Traits object can't have more than ${MAX_TRAITS_KEYS} keys`,
  })
  @Validate(TraitsKeyFormat, {
    message: `Traits keys must be non-empty and no longer than ${MAX_TRAIT_KEY_LENGTH} characters`,
  })
  @Validate(TraitsValueType, {
    message:
      'All of traits object values must be primitive JSON values without control characters',
  })
  @Validate(TraitsSizeLimit, {
    message: `Traits object can't have keys and values with total length more than ${MAX_TRAITS_TOTAL_LENGTH} characters`,
  })
  traits?: Record<string, string>
}
