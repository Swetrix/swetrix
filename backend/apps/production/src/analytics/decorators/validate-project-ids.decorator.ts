import { registerDecorator, ValidationOptions } from 'class-validator'
import { PID_REGEX } from '../../common/constants'

export function ValidateProjectIds(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'validateProjectIds',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (value === undefined || value === '') {
            return true // Allow empty or undefined values
          }

          if (typeof value === 'string') {
            try {
              value = JSON.parse(value)
            } catch {
              value = value.split(',')
            }
          }

          if (!Array.isArray(value)) {
            return false
          }

          return value.every(pid => PID_REGEX.test(pid))
        },
        defaultMessage() {
          return 'One of the provided Project IDs (pids) is incorrect'
        },
      },
    })
  }
}
