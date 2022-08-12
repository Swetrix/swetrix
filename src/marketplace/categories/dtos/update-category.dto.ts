import { ApiProperty } from '@nestjs/swagger'

export class UpdateCategory {
  @ApiProperty()
  readonly title?: string

  @ApiProperty()
  readonly description?: string | null
}
