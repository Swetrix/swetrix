import { Matches, IsEmail, IsNotEmpty, IsEnum } from 'class-validator'
import { ReportFrequency } from '../enums'

export class AddSubscriberParamsDto {
  @Matches(/^(?!.*--)[a-zA-Z0-9-]{12}$/)
  readonly projectId: string

  @IsNotEmpty()
  @IsEnum(ReportFrequency)
  readonly reportFrequency: ReportFrequency
}

export class AddSubscriberBodyDto {
  @IsEmail()
  readonly email: string
}
