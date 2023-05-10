import { Matches, IsUUID, IsString } from 'class-validator'

export class UpdateAnnotationsParamsDto {
  @Matches(/^(?!.*--)[a-zA-Z0-9-]{12}$/)
  readonly projectId: string

  @IsUUID('4')
  readonly annotationId: string
}

export class UpdateAnnotationsBodyDto {
  @IsString()
  readonly name: string

  @IsString()
  readonly date: string
}
