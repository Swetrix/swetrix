import { IsEmail, Matches } from 'class-validator'

export class TransferProjectParamsDto {
  @Matches(/^(?!.*--)[a-zA-Z0-9-]{12}$/)
  readonly projectId: string
}

export class TransferProjectBodyDto {
  @IsEmail()
  readonly email: string
}
