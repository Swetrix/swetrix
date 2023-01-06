import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator'

@ValidatorConstraint()
class IsPasswordConstraint implements ValidatorConstraintInterface {
  private readonly passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[a-zA-Z\d!@#$%^&*]{8,72}$/

  public validate(password: string): boolean {
    return this.passwordRegex.test(password)
  }
}

export function IsPassword(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return function (object: object, propertyName: string) {
    registerDecorator({
      propertyName,
      target: object.constructor,
      validator: IsPasswordConstraint,
      constraints: [],
      options: validationOptions,
    })
  }
}
