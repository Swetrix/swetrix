import { IsString } from 'class-validator'

export class DeleteExtensionParams {
  @IsString()
  readonly extensionId!: string
}
