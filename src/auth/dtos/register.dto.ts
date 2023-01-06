import { IsEmail, IsNotEmpty, IsBoolean } from 'class-validator'
import { IsPassword } from '../decorators'

export namespace RegisterDto {
  export class Request {
    @IsEmail({}, { message: 'validation.isEmail' })
    public readonly email: string

    @IsPassword({ message: 'validation.isPassword' })
    public readonly password: string

    @IsNotEmpty({ message: 'validation.isNotEmpty' })
    @IsBoolean({ message: 'validation.isBoolean' })
    public readonly checkIfLeaked: boolean
  }

  export class Response {
    public readonly accessToken: string
  }
}
