import { IsString } from 'class-validator'

export class UpdateExtensionParams {
  @IsString()
  readonly extensionId!: string
}
