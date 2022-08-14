import { IsNumberString } from 'class-validator'

export class UpdateExtensionParams {
  @IsNumberString()
  readonly extensionId!: number
}
