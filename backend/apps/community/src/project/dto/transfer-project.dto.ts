import { IsEmail, Matches } from 'class-validator'

export class TransferProjectBodyDto {
  @Matches(/^(?!.*--)[a-zA-Z0-9-]{12}$/)
  readonly projectId: string

  @IsEmail()
  readonly email: string
}
