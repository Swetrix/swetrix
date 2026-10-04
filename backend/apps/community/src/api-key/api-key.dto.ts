import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsString,
  Length,
  Matches,
} from 'class-validator'
import { API_KEY_SCOPES, ApiKeyScope } from './api-key.types'

export class SaveApiKeyDto {
  @IsString()
  @Length(1, 80)
  name: string

  @IsArray()
  @ArrayMaxSize(30)
  @ArrayUnique()
  @IsIn(
    Object.entries(API_KEY_SCOPES).flatMap(([scope, actions]) =>
      actions.map((action) => `${scope}:${action}`),
    ),
    { each: true },
  )
  scopes: ApiKeyScope[]

  @IsBoolean()
  allProjects: boolean

  @IsArray()
  @ArrayMaxSize(1000)
  @ArrayUnique()
  @IsString({ each: true })
  @Matches(/^(?!.*--)[a-zA-Z0-9-]{12}$/, { each: true })
  projectIds: string[]
}
