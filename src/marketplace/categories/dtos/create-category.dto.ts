import { ApiProperty } from '@nestjs/swagger'

export class CreateCategory {
  @ApiProperty()
  readonly title!: string

  @ApiProperty()
  readonly description?: string | null
}
