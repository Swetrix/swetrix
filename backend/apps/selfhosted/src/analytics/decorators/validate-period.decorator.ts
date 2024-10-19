import { registerDecorator, ValidationOptions } from 'class-validator'
import { UnprocessableEntityException } from '@nestjs/common'
import _includes from 'lodash/includes'

export const VALID_PERIODS = [
  '1h',
  'today',
  'yesterday',
  '1d',
  '7d',
  '4w',
  '3M',
  '12M',
  '24M',
  'all',
]

export function ValidatePeriod(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'validatePeriod',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (value === undefined || value === '') {
            return true // Allow empty or undefined values
          }
          if (!_includes(VALID_PERIODS, value)) {
            throw new UnprocessableEntityException(
              `The provided period is incorrect. It should be one of: ${VALID_PERIODS.join(', ')}`,
            )
          }
          return true
        },
      },
    })
  }
}
