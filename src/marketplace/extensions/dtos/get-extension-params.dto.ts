import { IsNumberString } from 'class-validator'

export class GetExtensionParams {
  @IsNumberString()
  readonly extensionId!: number
}
