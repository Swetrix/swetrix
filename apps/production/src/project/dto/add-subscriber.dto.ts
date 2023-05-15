import { Matches, IsEmail, IsNotEmpty, IsEnum, IsString } from 'class-validator'
import { ReportFrequency } from '../enums'

export class AddSubscriberParamsDto {
  @Matches(/^(?!.*--)[a-zA-Z0-9-]{12}$/)
  readonly projectId: string
}

export class AddSubscriberMetaParamsDTO {
  @IsString()
  readonly projectName: string
}

export class AddSubscriberBodyDto {
  @IsEmail()
  readonly email: string

  @IsNotEmpty()
  @IsEnum(ReportFrequency)
  readonly reportFrequency: ReportFrequency
}
