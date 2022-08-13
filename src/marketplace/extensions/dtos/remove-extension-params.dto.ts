import { IsNumberString } from 'class-validator'

export class RemoveExtensionParams {
  @IsNumberString()
  readonly extensionId!: number
}
