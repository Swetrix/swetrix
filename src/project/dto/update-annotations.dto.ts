import { Matches, IsUUID } from 'class-validator'

export class UpdateAnnotationsBodyDto {
  @Matches(/^(?!.*--)[a-zA-Z0-9-]{12}$/)
  readonly projectId: string

  @IsUUID('4')
  readonly annotationId: string
}

export class UpdateAnnotationsParamsDto {
  @Matches(/^(?!.*--)[a-zA-Z0-9-]{12}$/)
  readonly projectId: string
}
