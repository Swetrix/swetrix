import { IsNumberString } from 'class-validator'

export class DeleteExtensionParams {
  @IsNumberString()
  readonly extensionId!: number
}
