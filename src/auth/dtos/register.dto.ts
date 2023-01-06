import { IsBoolean, IsEmail, IsNotEmpty, Matches } from 'class-validator'

export namespace RegisterDto {
  export class Request {
    @IsEmail()
    public readonly email: string

    @Matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[a-zA-Z\d!@#$%^&*]{8,72}$/,
    )
    public readonly password: string

    @IsNotEmpty()
    @IsBoolean()
    public readonly checkIfLeaked: boolean
  }

  export class Response {
    public readonly accessToken: string
  }
}
