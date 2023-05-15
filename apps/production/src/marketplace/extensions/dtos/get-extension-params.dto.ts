import { IsString } from 'class-validator'

export class GetExtensionParams {
  @IsString()
  readonly extensionId!: string
}
