import { IsBoolean, IsEmail, IsNotEmpty } from 'class-validator'
import { IsPassword } from '../decorators'

export namespace RegisterDto {
  export class Request {
    @IsEmail()
    public readonly email: string

    @IsPassword()
    public readonly password: string

    @IsNotEmpty()
    @IsBoolean()
    public readonly checkIfLeaked: boolean
  }

  export class Response {
    public readonly accessToken: string
  }
}
