import { IsNumberString } from 'class-validator'

export class GetCategoryParams {
  @IsNumberString()
  readonly categoryId!: number
}
