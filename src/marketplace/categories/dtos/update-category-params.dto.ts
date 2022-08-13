import { IsNumberString } from 'class-validator'

export class UpdateCategoryParams {
  @IsNumberString()
  readonly categoryId!: number
}
