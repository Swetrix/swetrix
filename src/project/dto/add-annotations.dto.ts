import { IsString, Matches } from 'class-validator'

export class AddAnnotationsParamsDto {
  @Matches(/^(?!.*--)[a-zA-Z0-9-]{12}$/)
  readonly projectId: string
}

export class AddAnnotationsBodyDto {
  @IsString()
  readonly name: string

  @IsString()
  readonly date: string
}
