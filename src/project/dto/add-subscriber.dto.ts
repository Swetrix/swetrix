import { Matches, IsEmail } from 'class-validator'

export class AddSubscriberParamsDto {
  @Matches(/^(?!.*--)[a-zA-Z0-9-]{12}$/)
  readonly projectId: string
}

export class AddSubscriberBodyDto {
  @IsEmail()
  readonly email: string
}
