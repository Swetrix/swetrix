import { IsNumberString } from 'class-validator'

export class DeleteCategoryParams {
  @IsNumberString()
  readonly categoryId!: number
}
